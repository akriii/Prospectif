import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from database.session import get_db
from services.layers import LAYERS, METRICS, layer_meta, score
from services.spatial_service import (
    LIFESTYLE_POINTS,
    EDUCATION_POINTS,
    INDUSTRY_POINTS,
    normalize,
)

router = APIRouter(prefix="/api/predict", tags=["Spatial Predictions"])

STATS_YEAR = 2026

POINT_SOURCES = {
    "lifestyle": LIFESTYLE_POINTS,
    "education": EDUCATION_POINTS,
    "industry": INDUSTRY_POINTS,
}

# Point -> district is a join between two static datasets (the OSM extracts and
# the seeded boundaries), so it is resolved once per process rather than on
# every request. Restart the API after re-running the seeder.
_district_lookup_cache = {}


def _point_key(point):
    return (round(float(point["lon"]), 7), round(float(point["lat"]), 7))


def resolve_districts(db: Session, source_names):
    """Return {(lon, lat): district_name} for the given point sources.

    The lookup runs in PostGIS so it uses the GiST index on districts.geom and
    avoids shipping every district polygon (tens of thousands of vertices) back
    to the API on each call.
    """
    pending = []
    for source in source_names:
        if source in _district_lookup_cache:
            continue
        for point in POINT_SOURCES[source]:
            try:
                pending.append({"lon": float(point["lon"]), "lat": float(point["lat"])})
            except (TypeError, ValueError, KeyError):
                continue  # OSM element without usable coordinates
        _district_lookup_cache[source] = {}

    if pending:
        query = text("""
            WITH pts AS (
                SELECT DISTINCT
                       (p->>'lon')::float8 AS lon,
                       (p->>'lat')::float8 AS lat
                FROM jsonb_array_elements(CAST(:points AS jsonb)) AS p
            )
            SELECT DISTINCT ON (pts.lon, pts.lat)
                   pts.lon, pts.lat, d.name
            FROM pts
            JOIN districts d
              ON ST_Covers(d.geom, ST_SetSRID(ST_MakePoint(pts.lon, pts.lat), 4326))
            ORDER BY pts.lon, pts.lat, d.name
        """)
        resolved = {
            (round(row[0], 7), round(row[1], 7)): row[2]
            for row in db.execute(query, {"points": json.dumps(pending)}).fetchall()
        }
        for source in source_names:
            bucket = _district_lookup_cache[source]
            for point in POINT_SOURCES[source]:
                try:
                    key = _point_key(point)
                except (TypeError, ValueError, KeyError):
                    continue
                if key in resolved:
                    bucket[key] = resolved[key]

    lookup = {}
    for source in source_names:
        lookup.update(_district_lookup_cache[source])
    return lookup


# Districts treated as established university hubs by the education proxy
EDUCATION_HUBS = {"Kampar", "Muallim", "Perak Tengah", "Kinta"}


def load_district_scores(db: Session):
    """Fetch district statistics and normalise them into 0-1 scores."""
    query = text("""
        SELECT d.name AS district,
               e.new_jobs_created AS jobs,
               e.median_income AS income,
               COALESCE(o.unsold_units, 0) AS overhang,
               e.population AS population
        FROM districts d
        JOIN employment_stats e ON d.id = e.district_id
        LEFT JOIN (
            SELECT district_id, SUM(unsold_units) AS unsold_units
            FROM property_overhangs
            WHERE year = :year
            GROUP BY district_id
        ) o ON d.id = o.district_id
        WHERE e.year = :year
    """)
    rows = db.execute(query, {"year": STATS_YEAR}).fetchall()

    if not rows:
        raise HTTPException(
            status_code=503,
            detail=f"No district statistics seeded for {STATS_YEAR}. Run scripts/seed.py.",
        )

    # Lifestyle density = cafes/malls per 10k residents, from the OSM extract
    lifestyle_counts = {}
    for district_name in resolve_districts(db, ("lifestyle",)).values():
        lifestyle_counts[district_name] = lifestyle_counts.get(district_name, 0) + 1

    stats = []
    for name, jobs, income, overhang, population in rows:
        population = population or 0
        stats.append({
            "district": name,
            "jobs": jobs,
            "income": float(income or 0),
            "overhang": overhang,
            "population": population,
            "lifestyle_count": lifestyle_counts.get(name, 0),
            "lifestyle_density": (
                lifestyle_counts.get(name, 0) / population * 10_000 if population else 0.0
            ),
        })

    def column(key):
        return [s[key] for s in stats]

    districts = {}
    for s in stats:
        districts[s["district"]] = {
            "district": s["district"],
            "raw": {
                "jobs": s["jobs"],
                "income": s["income"],
                "overhang": s["overhang"],
                "population": s["population"],
                "lifestyle_count": s["lifestyle_count"],
                "lifestyle_density": round(s["lifestyle_density"], 2),
            },
            # Proxy education index favoring established university districts
            "edu_index": 1.0 if s["district"] in EDUCATION_HUBS else 0.4,
            "norm_jobs": normalize(s["jobs"], column("jobs")),
            "norm_income": normalize(s["income"], column("income")),
            "norm_overhang": normalize(s["overhang"], column("overhang")),
            "norm_lifestyle": normalize(s["lifestyle_density"], column("lifestyle_density")),
        }
    return districts


@router.get("/{layer}")
def get_heatmap_layer(layer: str, db: Session = Depends(get_db)):
    if layer not in LAYERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid layer. Choose {', '.join(LAYERS)}.",
        )

    districts = load_district_scores(db)
    sources = LAYERS[layer]["sources"]
    formula = LAYERS[layer]["formula"]
    lookup = resolve_districts(db, sources)

    district_scores = {}
    for name, district in districts.items():
        district_scores[name] = {
            "district": name,
            "score": round(score(formula, district), 3),
            "metrics": {metric: round(district[metric], 3) for metric in METRICS},
            "raw": district["raw"],
        }

    payload = []
    unmatched = 0
    for source in sources:
        for point in POINT_SOURCES[source]:
            try:
                key = _point_key(point)
            except (TypeError, ValueError, KeyError):
                unmatched += 1
                continue

            district_name = lookup.get(key)
            if district_name is None or district_name not in districts:
                # Point falls outside every seeded district boundary
                unmatched += 1
                continue

            payload.append({
                "name": point.get("name", "Unnamed Location"),
                "lat": point["lat"],
                "lon": point["lon"],
                "category": source,
                "district": district_name,
                "weight": district_scores[district_name]["score"],
            })

    return {
        "status": "success",
        "layer": layer,
        "meta": layer_meta(layer),
        "districts": district_scores,
        "total_points": len(payload),
        "unmatched_points": unmatched,
        "data": payload,
    }


@router.get("/debug/locate")
def locate_point(lat: float, lon: float, db: Session = Depends(get_db)):
    """Resolve a single coordinate to its district, for sanity-checking the join."""
    query = text("""
        SELECT d.name
        FROM districts d
        WHERE ST_Covers(d.geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
        ORDER BY d.name
    """)
    matches = [row[0] for row in db.execute(query, {"lat": lat, "lon": lon}).fetchall()]
    return {"lat": lat, "lon": lon, "districts": matches}
