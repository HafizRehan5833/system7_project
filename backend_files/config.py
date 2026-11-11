
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Set writable KERAS_HOME before tensorflow initializes
os.environ.setdefault("KERAS_HOME", str(BASE_DIR / "model_train" / ".keras"))

DEFAULT_MODEL_PATH = BASE_DIR / "model_train" / "saved_models" / "fruit_freshness_model.keras"
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH)))

# Must match the input size used during training
IMG_SIZE = (224, 224)

# Predictions below this confidence are flagged as uncertain
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.6"))

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}

default_origins = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", default_origins).split(",")
    if origin.strip()
]
