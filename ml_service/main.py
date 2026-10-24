"""Standalone Custom ML Model Service (FastAPI) for Log Incident Classification.

Deployable independently on Render, Fly.io, Railway, or Docker.
"""
from __future__ import annotations
import os, time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from ml_service.schemas import HealthResponse, PredictRequest, PredictResponse
from ml_service.model import get_model

START_TIME = time.time()
SERVICE_API_KEY = os.getenv("ML_SERVICE_API_KEY", "")

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Preload model on startup
    get_model()
    yield

app = FastAPI(
    title="Custom Log Incident ML Service",
    version="1.0.0",
    description="Independent machine learning inference API for production log anomaly and root-cause prediction.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_api_key(authorization: str | None = Header(None)) -> None:
    """Enforce token authentication if ML_SERVICE_API_KEY is configured in environment."""
    if not SERVICE_API_KEY:
        return
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer" or parts[1] != SERVICE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired model service API token"
        )

@app.get("/health", response_model=HealthResponse)
def health_check():
    """Return health status and uptime of the ML inference service."""
    return HealthResponse(
        status="healthy",
        service="custom-log-ml",
        model_version=get_model().model_version,
        uptime_seconds=round(time.time() - START_TIME, 2)
    )

@app.post("/predict", response_model=PredictResponse)
@app.post("/api/v1/predict", response_model=PredictResponse)
def predict_incident(request: PredictRequest, authorization: str | None = Header(None)):
    """Run log classification and incident root-cause inference."""
    verify_api_key(authorization)
    try:
        model = get_model()
        return model.predict(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inference failure during log classification"
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8002"))
    uvicorn.run("ml_service.main:app", host="0.0.0.0", port=port, reload=True)
