
from pathlib import Path

import numpy as np
import tensorflow as tf


class FruitFreshnessModel:

    def __init__(self, model_path: Path) -> None:
        if not model_path.exists():
            raise FileNotFoundError(
                f"Model file not found at {model_path}. "
                "Train the model first by running model_train/train.py."
            )
        # compile=False skips optimizer state, which is not needed for inference
        self._model = tf.keras.models.load_model(model_path, compile=False)

    def predict_spoiled_probability(self, batch: np.ndarray) -> float:
        probabilities = self._model.predict(batch, verbose=0)
        return float(probabilities.ravel()[0])
