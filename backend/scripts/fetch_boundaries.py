"""Fetch real administrative boundaries for the 12 Perak districts.

The seeder originally inserted one identical placeholder box for every
district, so every point-in-polygon lookup matched whichever district the
database returned first. This script pulls the genuine district polygons
(OSM admin_level 6) from Nominatim and stores them as a GeoJSON
FeatureCollection, so seeding stays offline and reproducible afterwards.
"""

import json
import os
import time
import urllib.parse
import urllib.request

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "ProspectifAI-Hackathon/1.0 (Student Project)"
OUTPUT_PATH = os.path.join("data", "perak_districts.geojson")

# Perak bounding box, used as a sanity check on whatever Nominatim returns
PERAK_BBOX = (100.0, 3.4, 101.9, 6.0)  # min_lon, min_lat, max_lon, max_lat

# Canonical district name (matching the DOSM/NAPIC CSVs) -> OSM search aliases
DISTRICT_QUERIES = {
    "Kinta": ["Kinta"],
    "Manjung": ["Manjung", "Manjung (Dinding)"],
    "Larut, Matang & Selama": ["Larut Matang dan Selama", "Larut dan Matang"],
    "Batang Padang": ["Batang Padang"],
    "Hilir Perak": ["Hilir Perak"],
    "Perak Tengah": ["Perak Tengah"],
    "Kampar": ["Kampar"],
    "Hulu Perak": ["Hulu Perak"],
    "Bagan Datuk": ["Bagan Datuk", "Bagan Datoh"],
    "Kuala Kangsar": ["Kuala Kangsar"],
    "Kerian": ["Kerian"],
    "Muallim": ["Muallim"],
}

# place_rank 12 is the district (daerah) level; 14+ would be a sub-district
DISTRICT_PLACE_RANK = 12


def _request(name):
    params = urllib.parse.urlencode({
        "q": f"{name}, Perak, Malaysia",
        "format": "jsonv2",
        "polygon_geojson": "1",
        "limit": "8",
    })
    req = urllib.request.Request(
        f"{NOMINATIM_URL}?{params}",
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def _rings(geometry):
    """Yield every polygon ring list, for both Polygon and MultiPolygon."""
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"]]
    if geometry["type"] == "MultiPolygon":
        return geometry["coordinates"]
    return []


def _within_perak(geometry):
    min_lon, min_lat, max_lon, max_lat = PERAK_BBOX
    for polygon in _rings(geometry):
        for lon, lat in polygon[0]:
            if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
                return False
    return True


def _pick_boundary(results):
    for r in results:
        geometry = r.get("geojson") or {}
        if r.get("category") != "boundary" or r.get("type") != "administrative":
            continue
        if int(r.get("place_rank", 0)) != DISTRICT_PLACE_RANK:
            continue
        if geometry.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        if "Perak" not in (r.get("display_name") or ""):
            continue
        if not _within_perak(geometry):
            continue
        return r, geometry
    return None, None


def fetch_boundaries():
    features = []
    missing = []

    for canonical, aliases in DISTRICT_QUERIES.items():
        match, geometry = None, None
        for alias in aliases:
            print(f"Fetching boundary for {canonical} (as '{alias}')...")
            try:
                results = _request(alias)
            except Exception as exc:
                print(f"  Request failed: {exc}")
                results = []
            match, geometry = _pick_boundary(results)
            time.sleep(1.2)  # Nominatim asks for max 1 request/second
            if geometry:
                break

        if not geometry:
            print(f"  No administrative boundary found for {canonical}")
            missing.append(canonical)
            continue

        # Normalise everything to MultiPolygon so the DB column stays uniform
        if geometry["type"] == "Polygon":
            geometry = {"type": "MultiPolygon", "coordinates": [geometry["coordinates"]]}

        features.append({
            "type": "Feature",
            "properties": {
                "district": canonical,
                "osm_id": match.get("osm_id"),
                "osm_display_name": match.get("display_name"),
            },
            "geometry": geometry,
        })
        rings = sum(len(p[0]) for p in geometry["coordinates"])
        print(f"  OK: osm relation {match.get('osm_id')}, {len(geometry['coordinates'])} part(s), {rings} vertices")

    if missing:
        raise SystemExit(f"Aborting: missing boundaries for {missing}. Re-run or add an alias.")

    os.makedirs("data", exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)

    print(f"\nSaved {len(features)} district boundaries to {OUTPUT_PATH}")


if __name__ == "__main__":
    fetch_boundaries()
