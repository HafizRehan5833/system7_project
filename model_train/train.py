"""Two-phase transfer-learning training pipeline.

Phase 1: train only the classification head while the MobileNetV2 base is frozen.
Phase 2: unfreeze the top layers of the base and fine-tune with a lower learning rate.
"""

import json
import logging
from typing import Dict, List, Tuple

import tensorflow as tf
from tensorflow.keras import callbacks, losses, metrics, optimizers

import config
from model import build_model, unfreeze_top_layers

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def load_datasets() -> Tuple[tf.data.Dataset, tf.data.Dataset]:
    """Load train and validation datasets from folders."""
    common_args = dict(
        labels="inferred",
        label_mode="binary",
        class_names=config.CLASS_NAMES,
        image_size=config.IMG_SIZE,
        batch_size=config.BATCH_SIZE,
        seed=config.SEED,
    )

    train_ds = tf.keras.utils.image_dataset_from_directory(
        config.TRAIN_DIR, shuffle=True, **common_args
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        config.VAL_DIR, shuffle=False, **common_args
    )

    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.cache().shuffle(1000).prefetch(autotune)
    val_ds = val_ds.cache().prefetch(autotune)
    return train_ds, val_ds


def compile_model(model: tf.keras.Model, learning_rate: float) -> None:
    """Compile the model with binary cross-entropy and useful metrics."""
    model.compile(
        optimizer=optimizers.Adam(learning_rate=learning_rate),
        loss=losses.BinaryCrossentropy(),
        metrics=[
            metrics.BinaryAccuracy(name="accuracy"),
            metrics.AUC(name="auc"),
            metrics.Precision(name="precision"),
            metrics.Recall(name="recall"),
        ],
    )


def make_callbacks() -> List[callbacks.Callback]:
    """Create callbacks. A new set is created for each phase."""
    config.MODEL_DIR.mkdir(parents=True, exist_ok=True)
    return [
        callbacks.ModelCheckpoint(
            filepath=config.MODEL_DIR / config.BEST_MODEL_NAME,
            monitor="val_auc",
            mode="max",
            save_best_only=True,
            verbose=1,
        ),
        callbacks.EarlyStopping(
            monitor="val_auc",
            mode="max",
            patience=4,
            restore_best_weights=True,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=2,
            min_lr=1e-7,
            verbose=1,
        ),
    ]


def merge_histories(histories: List[Dict[str, List[float]]]) -> Dict[str, List[float]]:
    """Combine the history dictionaries from each training phase."""
    merged: Dict[str, List[float]] = {}
    for history in histories:
        for key, values in history.items():
            merged.setdefault(key, []).extend(float(v) for v in values)
    return merged


def main() -> None:
    tf.keras.utils.set_random_seed(config.SEED)

    logger.info("Loading datasets from %s", config.DATA_DIR)
    train_ds, val_ds = load_datasets()

    logger.info("Building model")
    model, base = build_model(base_trainable=False)
    model.summary(print_fn=logger.info)

    logger.info("Phase 1: training classification head")
    compile_model(model, config.LR_HEAD)
    history_head = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=config.EPOCHS_HEAD,
        callbacks=make_callbacks(),
    )

    logger.info("Phase 2: fine-tuning top %d base layers", config.FINE_TUNE_LAYERS)
    unfreeze_top_layers(base, config.FINE_TUNE_LAYERS)
    compile_model(model, config.LR_FINE)
    history_fine = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=config.EPOCHS_HEAD + config.EPOCHS_FINE,
        initial_epoch=len(history_head.epoch),
        callbacks=make_callbacks(),
    )

    history = merge_histories([history_head.history, history_fine.history])
    history_path = config.MODEL_DIR / config.HISTORY_NAME
    with history_path.open("w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    logger.info("Best model saved to %s", config.MODEL_DIR / config.BEST_MODEL_NAME)
    logger.info("Training history saved to %s", history_path)


if __name__ == "__main__":
    main()
