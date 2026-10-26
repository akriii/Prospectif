import os
import json

def load_json(filename):
    filepath = os.path.join("data", filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def normalize(val, arr):
    if not arr:
        return 0.5
    min_val, max_val = min(arr), max(arr)
    return 0.5 if max_val == min_val else (val - min_val) / (max_val - min_val)

# Pre-load data into memory for instant API responses
LIFESTYLE_POINTS = load_json("lifestyle_points.json")
EDUCATION_POINTS = load_json("education_points.json")
INDUSTRY_POINTS = load_json("industry_points.json")