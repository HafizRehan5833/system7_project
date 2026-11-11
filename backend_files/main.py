
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

import config
from model_service import FruitFreshnessModel
from preprocessing import preprocess_image_bytes
from schemas import HealthResponse, PredictionResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("fruit_freshness_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model once at startup instead of on every request."""
    logger.info("Initializing FruitFreshnessModel (source=%s)...", config.MODEL_SOURCE)
    app.state.model = FruitFreshnessModel(
        model_path=config.MODEL_PATH,
        hf_repo_id=config.HF_REPO_ID,
        hf_filename=config.HF_FILENAME,
        source=config.MODEL_SOURCE,
    )
    logger.info(
        "Model loaded successfully from %s (source: %s)",
        app.state.model.model_location,
        app.state.model.source,
    )
    yield
    logger.info("Shutting down API")


app = FastAPI(
    title="Fruit Freshness Detection API",
    description="Classify fruit images as fresh or spoiled using a TensorFlow CNN.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_prediction(spoiled_probability: float, filename: str | None) -> PredictionResponse:
    """Convert the raw model output into a user-facing response."""
    is_spoiled = spoiled_probability >= 0.5
    label = "spoiled" if is_spoiled else "fresh"
    confidence = spoiled_probability if is_spoiled else 1.0 - spoiled_probability
    is_uncertain = confidence < config.CONFIDENCE_THRESHOLD

    if is_uncertain:
        message = "Low confidence. Try a clearer photo with even lighting and a plain background."
    else:
        message = f"The fruit appears to be {label}."

    return PredictionResponse(
        filename=filename,
        label=label,
        confidence=round(confidence, 4),
        spoiled_probability=round(spoiled_probability, 4),
        is_uncertain=is_uncertain,
        message=message,
    )


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """Report whether the API is running and the model is loaded."""
    model = getattr(app.state, "model", None)
    model_loaded = model is not None
    source = getattr(model, "source", None) if model_loaded else None
    model_location = getattr(model, "model_location", None) if model_loaded else None
    return HealthResponse(
        status="ok",
        model_loaded=model_loaded,
        source=source,
        model_location=model_location,
    )


@app.post("/predict", response_model=PredictionResponse, tags=["prediction"])
async def predict(file: UploadFile = File(..., description="Fruit image (JPEG, PNG, WebP, BMP)")):
    """Classify an uploaded fruit image as fresh or spoiled."""
    if file.content_type not in config.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Upload a JPEG, PNG, WebP, or BMP image.",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")
    if len(contents) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large. The maximum size is 10 MB.",
        )

    try:
        batch = preprocess_image_bytes(contents)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    spoiled_probability = await run_in_threadpool(
        app.state.model.predict_spoiled_probability, batch
    )

    logger.info("Predicted %s (p_spoiled=%.4f)", file.filename, spoiled_probability)
    return build_prediction(spoiled_probability, file.filename)
