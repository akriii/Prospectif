import json

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from database.session import get_db
from services.layers import LAYERS, layer_meta

router = APIRouter(prefix="/api", tags=["Metadata"])

# ~100 m tolerance: plenty for a district outline, and it shrinks the
# raw boundary file (hundreds of KB) to something cheap to ship to the browser.
SIMPLIFY_TOLERANCE_DEG = 0.001

_boundaries_cache = None


@router.get("/layers")
def list_layers():
    return {"layers": [layer_meta(key) for key in LAYERS]}


@router.get("/districts/boundaries")
def district_boundaries(db: Session = Depends(get_db)):
    """District outlines as a GeoJSON FeatureCollection for the map overlay."""
    global _boundaries_cache
    if _boundaries_cache is None:
        query = text("""
            SELECT name,
                   ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, :tolerance), 5) AS geojson
            FROM districts
            ORDER BY name
        """)
        rows = db.execute(query, {"tolerance": SIMPLIFY_TOLERANCE_DEG}).fetchall()
        _boundaries_cache = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"district": name},
                    "geometry": json.loads(geojson),
                }
                for name, geojson in rows
            ],
        }
    return _boundaries_cache
