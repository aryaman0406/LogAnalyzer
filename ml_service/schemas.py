"""Pydantic schemas for the standalone Custom ML Model Service."""
from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field

class LogEntry(BaseModel):
    timestamp: str = Field(default="", description="ISO timestamp or time of log emission")
    level: str = Field(default="INFO", description="Log level: INFO, WARN, ERROR, CRITICAL")
    message: str = Field(..., description="Raw log line message")
    source: str = Field(default="", description="Service, logger name, or file emitting the log")

class PredictRequest(BaseModel):
    incident_id: str | None = Field(default=None, description="Optional incident identifier if known (e.g. INC-07)")
    log_entries: list[LogEntry] = Field(..., description="List of structured or parsed log lines")
    features: dict[str, Any] = Field(default_factory=dict, description="Precomputed log statistics or sequence features")

class PredictResponse(BaseModel):
    model_version: str = Field(default="1.0.0", description="Version of the deployed ML inference model")
    predicted_category: str = Field(..., description="Predicted failure category or incident class")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model prediction confidence score between 0.0 and 1.0")
    suspected_files: list[str] = Field(default_factory=list, description="Candidate affected source files identified by model")
    suspected_functions: list[str] = Field(default_factory=list, description="Candidate affected functions or methods")
    severity: str = Field(default="medium", description="Predicted severity level: low, medium, high, critical")
    anomaly_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Quantitative sequence anomaly score")
    features_extracted: dict[str, Any] = Field(default_factory=dict, description="Key features or patterns detected in log payload")

class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Service health indicator: healthy, degraded")
    service: str = Field(default="custom-log-ml", description="Service identifier")
    model_version: str = Field(default="1.0.0", description="Active model version")
    uptime_seconds: float = Field(default=0.0, description="Elapsed seconds since startup")
