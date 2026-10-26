from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.meta import router as meta_router
from routers.predict import router as predict_router

app = FastAPI(title="Prospectif AI - Spatial Matchmaker")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://prospectif-api.onrender.com/"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

)

# Mount the modular router
app.include_router(predict_router)
app.include_router(meta_router)
