import logging
from pathlib import Path
from typing import Optional

import numpy as np
import tensorflow as tf

logger = logging.getLogger("fruit_freshness_api")


class FruitFreshnessModel:
    """Wrapper around the trained Keras model, supporting local or Hugging Face Hub loading."""

    def __init__(
        self,
        model_path: Optional[Path] = None,
        hf_repo_id: Optional[str] = None,
        hf_filename: str = "fruit_freshness_model.keras",
        source: str = "auto",
    ) -> None:
        self.source = source
        self.model_location = ""
        resolved_path: Optional[Path] = None

        # 1. Attempt Hugging Face Hub if explicitly requested
        if source == "huggingface" and hf_repo_id:
            resolved_path = self._download_from_hf(hf_repo_id, hf_filename)
            self.source = "huggingface"
            self.model_location = f"{hf_repo_id}/{hf_filename}"

        # 2. Local mode
        elif source == "local":
            if model_path and model_path.exists():
                resolved_path = model_path
                self.source = "local"
                self.model_location = str(model_path)
            else:
                raise FileNotFoundError(f"Local model not found at {model_path}.")

        # 3. Auto mode: Use local if available, otherwise fetch from Hugging Face Hub
        else:
            if model_path and model_path.exists():
                logger.info("Found local model at %s", model_path)
                resolved_path = model_path
                self.source = "local"
                self.model_location = str(model_path)
            elif hf_repo_id:
                logger.info("Local model not found. Fetching from Hugging Face Hub: %s", hf_repo_id)
                resolved_path = self._download_from_hf(hf_repo_id, hf_filename)
                self.source = "huggingface"
                self.model_location = f"{hf_repo_id}/{hf_filename}"
            else:
                raise FileNotFoundError("No local model found and no Hugging Face repo provided.")

        logger.info("Loading model weights from %s (source: %s)...", resolved_path, self.source)
        self._model = tf.keras.models.load_model(str(resolved_path), compile=False)
        logger.info("Model loaded successfully into memory.")

    def _download_from_hf(self, repo_id: str, filename: str) -> Path:
        from huggingface_hub import hf_hub_download

        logger.info("Downloading/verifying '%s' from Hugging Face repo '%s'...", filename, repo_id)
        downloaded = hf_hub_download(repo_id=repo_id, filename=filename)
        return Path(downloaded)

    def predict_spoiled_probability(self, batch: np.ndarray) -> float:
        """Return the probability that the fruit in the batch is spoiled."""
        probabilities = self._model.predict(batch, verbose=0)
        return float(probabilities.ravel()[0])
