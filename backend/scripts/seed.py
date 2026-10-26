import json
import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load Supabase URL
load_dotenv(dotenv_path="../.env") # Adjusted path based on your folder structure
DATABASE_URL = os.getenv("SUPABASE_DATABASE_URL")
engine = create_engine(DATABASE_URL)

# All 12 Perak Districts
districts = [
    "Kinta", "Manjung", "Larut, Matang & Selama", "Batang Padang", 
    "Hilir Perak", "Perak Tengah", "Kampar", "Hulu Perak", 
    "Bagan Datuk", "Kuala Kangsar", "Kerian", "Muallim"
]

BOUNDARY_PATH = os.path.join("data", "perak_districts.geojson")


def load_district_geometries():
    """Read the real district polygons produced by scripts/fetch_boundaries.py.

    Without these every district shares one placeholder box, which makes every
    point-in-polygon lookup resolve to whichever district the database happens
    to return first.
    """
    if not os.path.exists(BOUNDARY_PATH):
        raise SystemExit(
            f"Missing {BOUNDARY_PATH}. Run `python scripts/fetch_boundaries.py` first."
        )

    with open(BOUNDARY_PATH, encoding="utf-8") as f:
        collection = json.load(f)

    geometries = {
        feature["properties"]["district"]: json.dumps(feature["geometry"])
        for feature in collection["features"]
    }

    missing = [d for d in districts if d not in geometries]
    if missing:
        raise SystemExit(f"{BOUNDARY_PATH} has no geometry for: {missing}")

    return geometries


def seed_districts():
    print("Seeding districts with real boundaries...")
    geometries = load_district_geometries()

    with engine.begin() as conn:
        for d in districts:
            # ST_Multi keeps single-part polygons compatible with the MULTIPOLYGON column.
            # Existing rows are updated so a previously seeded placeholder box gets replaced.
            query = text("""
                INSERT INTO districts (name, geom)
                VALUES (
                    :name,
                    ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326))
                )
                ON CONFLICT (name) DO UPDATE SET geom = EXCLUDED.geom;
            """)
            conn.execute(query, {"name": d, "geojson": geometries[d]})

        # The point-in-polygon join in routers/predict.py relies on this index.
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_districts_geom ON districts USING GIST (geom);"
        ))

    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, name FROM districts")).fetchall()
        return {row[1]: row[0] for row in result}

def seed_dosm(district_map):
    print("Processing OpenDOSM (Population, Jobs, Income) data...")
    
    # 1. Population Data (2026)
    pop_df = pd.read_csv("data/population_district.csv")
    pop = pop_df[(pop_df['state'] == 'Perak') & (pop_df['sex'] == 'both') & (pop_df['age'] == 'overall') & (pop_df['ethnicity'] == 'overall')].copy()
    pop = pop[pop['date'] == pop['date'].max()][['district', 'population']]
    pop['district'] = pop['district'].replace({'Larut Dan Matang': 'Larut, Matang & Selama', 'Selama': 'Larut, Matang & Selama'})
    pop = pop.groupby('district', as_index=False).sum()
    pop['population'] = pop['population'] * 1000 # Convert from thousands

    # 2. Employment Data (Latest)
    lfs_df = pd.read_csv("data/lfs_district.csv")
    lfs = lfs_df[lfs_df['state'] == 'Perak'].copy()
    lfs = lfs[lfs['date'] == lfs['date'].max()][['district', 'lf_employed']]
    lfs['district'] = lfs['district'].replace({'Larut & Matang': 'Larut, Matang & Selama', 'Selama': 'Larut, Matang & Selama'})
    lfs = lfs.groupby('district', as_index=False).sum()
    lfs['lf_employed'] = lfs['lf_employed'] * 1000 # Convert from thousands

    # 3. Income Data (Latest)
    inc_df = pd.read_csv("data/hh_income_district.csv")
    inc = inc_df[inc_df['state'] == 'Perak'].copy()
    inc = inc[inc['date'] == inc['date'].max()][['district', 'income_median']]
    inc['district'] = inc['district'].replace({'Larut & Matang': 'Larut, Matang & Selama', 'Selama': 'Larut, Matang & Selama'})
    inc = inc.groupby('district', as_index=False).mean()

    # 4. Merge Data
    merged = pd.merge(pop, lfs, on='district', how='inner')
    merged = pd.merge(merged, inc, on='district', how='inner')
    
    # Map to schema: using 'lf_employed' for the 'new_jobs_created' column to fit existing DB schema
    merged['district_id'] = merged['district'].map(district_map)
    merged['year'] = 2026
    merged = merged.rename(columns={'lf_employed': 'new_jobs_created', 'income_median': 'median_income'})
    
    df_final = merged[['district_id', 'year', 'population', 'new_jobs_created', 'median_income']]

    # Clear the years we are about to write so re-running the seeder is safe
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM employment_stats WHERE year = ANY(:years)"),
            {"years": sorted(set(int(y) for y in df_final['year']))},
        )
    df_final.to_sql('employment_stats', engine, if_exists='append', index=False)

def seed_napic(district_map):
    print("Processing NAPIC Overhang data...")
    df = pd.read_csv("data/napic_overhang.csv")
    
    df = df.rename(columns={
        'Tahun': 'year',
        'Kategori': 'property_type',
        'Total_Unsold_Units': 'unsold_units',
        'Total_Value_RM_Million': 'total_value_rm'
    })
    
    # Convert Millions to exact RM figures
    df['total_value_rm'] = df['total_value_rm'] * 1000000 
    df['district_id'] = df['Daerah'].map(district_map)
    
    df_final = df[['district_id', 'year', 'property_type', 'unsold_units', 'total_value_rm']].dropna(subset=['district_id'])

    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM property_overhangs WHERE year = ANY(:years)"),
            {"years": sorted(set(int(y) for y in df_final['year']))},
        )
    df_final.to_sql('property_overhangs', engine, if_exists='append', index=False)

if __name__ == "__main__":
    district_map = seed_districts()
    print(f"District Map Generated")
    
    seed_dosm(district_map)
    seed_napic(district_map)
    
    print("Database fully seeded successfully.")