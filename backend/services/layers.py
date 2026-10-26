"""Single source of truth for the four feasibility pillars.

Each formula is plain data so the API can ship the exact weights to the
frontend's score breakdown; the score itself is computed from the same list,
which keeps the maths and the explanation from drifting apart.
"""

# Human-readable labels for every normalised district metric (all 0-1)
METRICS = {
    "norm_jobs": "Employment base",
    "norm_income": "Median household income",
    "edu_index": "Education index (proxy)",
    "norm_overhang": "Unsold housing overhang",
    "norm_lifestyle": "Lifestyle amenity density",
}

LAYERS = {
    "apex": {
        "title": "The Apex Score",
        "description": "Master overview of balanced micro-cities: strong jobs and wages, "
                       "an educated workforce and a healthy, absorbed housing market.",
        "sources": ("lifestyle", "education", "industry"),
        "formula": [
            {"metric": "norm_jobs", "weight": 0.3, "inverted": False},
            {"metric": "norm_income", "weight": 0.3, "inverted": False},
            {"metric": "edu_index", "weight": 0.2, "inverted": False},
            {"metric": "norm_overhang", "weight": 0.2, "inverted": True},
        ],
    },
    "talent": {
        "title": "Talent Magnet",
        "description": "Education and lifestyle anchors in areas where wages are still low: "
                       "a skilled, affordable workforce waiting for employers.",
        "sources": ("education", "lifestyle"),
        "formula": [
            {"metric": "edu_index", "weight": 0.6, "inverted": False},
            {"metric": "norm_income", "weight": 0.4, "inverted": True},
        ],
    },
    "retail": {
        "title": "Retail Vacuum",
        "description": "High wages and job density around industrial zones, but few "
                       "cafes and malls per resident: unmet consumer demand.",
        "sources": ("industry",),
        "formula": [
            {"metric": "norm_income", "weight": 0.4, "inverted": False},
            {"metric": "norm_jobs", "weight": 0.3, "inverted": False},
            {"metric": "norm_lifestyle", "weight": 0.3, "inverted": True},
        ],
    },
    "housing": {
        "title": "Housing Gap",
        "description": "Strong job and income growth while the unsold housing stock is "
                       "nearly absorbed: demand is outrunning supply.",
        "sources": ("industry", "education", "lifestyle"),
        "formula": [
            {"metric": "norm_jobs", "weight": 0.4, "inverted": False},
            {"metric": "norm_income", "weight": 0.3, "inverted": False},
            {"metric": "norm_overhang", "weight": 0.3, "inverted": True},
        ],
    },
}


def score(formula, district):
    """Weighted sum of a district's normalised metrics for one formula."""
    total = 0.0
    for term in formula:
        value = district[term["metric"]]
        total += term["weight"] * ((1 - value) if term["inverted"] else value)
    return total


def describe_formula(formula):
    return [{**term, "label": METRICS[term["metric"]]} for term in formula]


def layer_meta(key):
    layer = LAYERS[key]
    return {
        "key": key,
        "title": layer["title"],
        "description": layer["description"],
        "sources": list(layer["sources"]),
        "formula": describe_formula(layer["formula"]),
    }
