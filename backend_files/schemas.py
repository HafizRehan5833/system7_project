"""Pydantic models for API requests and responses."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class PredictionResponse(BaseModel):
    filename: Optional[str] = Field(None, description="Original uploaded file name")
    label: Literal["fresh", "spoiled"] = Field(..., description="Predicted freshness")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence of the predicted label")
    spoiled_probability: float = Field(..., ge=0.0, le=1.0, description="Raw model output")
    is_uncertain: bool = Field(..., description="True if confidence is below the threshold")
    message: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
