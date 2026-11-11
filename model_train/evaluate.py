
import json
import logging

import matplotlib

matplotlib.use("Agg") 
import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

import config

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def load_test_dataset() -> tf.data.Dataset:
    return tf.keras.utils.image_dataset_from_directory(
        config.TEST_DIR,
        labels="inferred",
        label_mode="binary",
        class_names=config.CLASS_NAMES,
        image_size=config.IMG_SIZE,
        batch_size=config.BATCH_SIZE,
        shuffle=False,
        verbose=False,
    )


def save_confusion_matrix(cm: np.ndarray, output_path) -> None:
    fig, ax = plt.subplots(figsize=(5, 4))
    image = ax.imshow(cm, cmap="Blues")
    fig.colorbar(image, ax=ax)
    ax.set_xticks(range(len(config.CLASS_NAMES)), config.CLASS_NAMES)
    ax.set_yticks(range(len(config.CLASS_NAMES)), config.CLASS_NAMES)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("Confusion Matrix (Test Set)")

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, int(cm[i, j]), ha="center", va="center", color="black")

    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)


def main() -> None:
    model_path = config.MODEL_DIR / config.BEST_MODEL_NAME
    if not model_path.exists():
        raise FileNotFoundError(f"No trained model at {model_path}. Run train.py first.")

    logger.info("Loading model from %s", model_path)
    model = tf.keras.models.load_model(model_path, compile=False)

    test_ds = load_test_dataset()
    y_true = np.concatenate([labels.numpy() for _, labels in test_ds]).ravel().astype(int)
    y_prob = model.predict(test_ds, verbose=0).ravel()
    y_pred = (y_prob >= 0.5).astype(int)

    report = classification_report(
        y_true, y_pred, target_names=config.CLASS_NAMES, digits=4, output_dict=True
    )
    logger.info("\n%s", classification_report(
        y_true, y_pred, target_names=config.CLASS_NAMES, digits=4
    ))

    cm = confusion_matrix(y_true, y_pred)
    config.MODEL_DIR.mkdir(parents=True, exist_ok=True)

    report_path = config.MODEL_DIR / config.EVAL_REPORT_NAME
    with report_path.open("w", encoding="utf-8") as f:
        json.dump({"report": report, "confusion_matrix": cm.tolist()}, f, indent=2)

    save_confusion_matrix(cm, config.MODEL_DIR / config.CONFUSION_MATRIX_NAME)
    logger.info("Evaluation report saved to %s", report_path)


if __name__ == "__main__":
    main()
