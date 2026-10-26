import os
import json

def load_json(filename):
    filepath = os.path.join("data", filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def normalize(val, arr):
    min_val, max_val = min(arr), max(arr)
    return 0.5 if max_val == min_val else (val - min_val) / (max_val - min_val)