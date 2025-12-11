# backend/app/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional

class TLEModel(BaseModel):
    name: str
    line1: str
    line2: str

class PropagationRequest(BaseModel):
    tles: List[TLEModel] = Field(..., description="List of TLEs (name + two lines)")
    propagate_seconds: int = Field(3600, description="Seconds ahead to predict")
    samples: int = Field(60, description="Number of samples to return per satellite")

class SamplePoint(BaseModel):
    timestamp: str
    lat: float
    lon: float
    alt_m: float
    r_km: List[float]
    v_km_s: Optional[List[float]] = None

class SatelliteTrajectory(BaseModel):
    id: str
    name: str
    trajectory: List[SamplePoint]

class CollisionAlert(BaseModel):
    sat1: str
    sat2: str
    distance_km: float

class PropagationResponse(BaseModel):
    results: List[SatelliteTrajectory]
    alerts: List[CollisionAlert]
