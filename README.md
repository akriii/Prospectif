# Prospectif

Predictive site-selection API for housing development in Perak. Aggregates NAPIC
property-overhang data and DOSM employment/income/population data against real
district boundaries, and scores OpenStreetMap anchor points (industry, education,
lifestyle) to produce heatmap layers.

## Layers

| Layer     | Anchor points used              | Question it answers                         |
|-----------|---------------------------------|---------------------------------------------|
| `apex`    | lifestyle + education + industry | Overall development potential                |
| `talent`  | education + lifestyle           | Affordable districts near talent pipelines    |
| `retail`  | industry                        | Spending power around industrial zones        |
| `housing` | industry + education + lifestyle | Where new housing supply actually has demand  |

## Setup order

The pipeline has a strict order, because the point-in-polygon join needs real
district polygons in the database before it can produce meaningful answers.

```bash
cd backend

# 1. OSM anchor points -> data/{lifestyle,education,industry}_points.json
python scripts/fetch_osm.py

# 2. Real district boundaries -> data/perak_districts.geojson   (stdlib only)
python scripts/fetch_boundaries.py

# 3. Load districts + statistics into PostGIS (re-runnable, replaces by year)
python scripts/seed.py

# 4. Serve
uvicorn main:app --reload
```

Steps 1 and 2 only need to be re-run when you want fresher upstream data; both
write their output into `backend/data/`, so seeding works offline afterwards.

All scripts assume `backend/` is the working directory (paths like `data/...`
and `../.env` are relative to it). `.env` must define
`SUPABASE_DATABASE_URL`.

## Running with Docker

`requirements.txt` is pinned for Python 3.11 (`sqlalchemy==2.0.29` does not
import on Python 3.13), which is what `backend/Dockerfile` uses.

```bash
docker compose up --build            # serve on :8000
docker compose run --rm api python scripts/seed.py
```

## Verifying the spatial join

`GET /api/predict/debug/locate?lat=..&lon=..` resolves a single coordinate to
its district. Known-good answers:

| Point              | lat, lon           | District     |
|--------------------|--------------------|--------------|
| Lumut              | 4.2333, 100.6333   | Manjung      |
| UTP Seri Iskandar  | 4.3860, 100.9690   | Perak Tengah |
| Ipoh               | 4.5975, 101.0901   | Kinta        |

Every layer response also reports `unmatched_points` — the number of anchor
points that fell outside all 12 district polygons. It should be `0`; a non-zero
value means boundaries are missing or stale, so re-run steps 2 and 3.
