

from typing import Tuple

from tensorflow.keras import Model, Sequential, layers
from tensorflow.keras.applications import MobileNetV2

import config


def build_data_augmentation() -> Sequential:
    return Sequential(
        [
            layers.RandomFlip("horizontal_and_vertical"),
            layers.RandomRotation(0.2),
            layers.RandomZoom((-0.15, 0.15)),
            layers.RandomContrast(0.15),
            layers.RandomBrightness(0.1),
            layers.RandomTranslation(0.1, 0.1),
        ],
        name="data_augmentation",
    )


def build_model(base_trainable: bool = False) -> Tuple[Model, Model]:
    """Build the full model.

    Args:
        base_trainable: Whether the MobileNetV2 base starts as trainable.

    Returns:
        A tuple of (full_model, mobilenet_base). The base is returned so that
        its top layers can be unfrozen for fine-tuning.
    """
    input_shape = (*config.IMG_SIZE, 3)
    inputs = layers.Input(shape=input_shape, name="image")

    x = build_data_augmentation()(inputs)

    # MobileNetV2 expects pixel values in [-1, 1]. Doing this inside the model
    # means the API can send raw 0-255 pixels with no extra preprocessing.
    x = layers.Rescaling(1.0 / 127.5, offset=-1.0, name="rescale")(x)

    base = MobileNetV2(input_shape=input_shape, include_top=False, weights="imagenet")
    base.trainable = base_trainable
    x = base(x, training=False)

    x = layers.GlobalAveragePooling2D(name="global_avg_pool")(x)
    x = layers.BatchNormalization(name="head_bn")(x)
    x = layers.Dropout(config.DROPOUT_RATE, name="dropout_1")(x)
    x = layers.Dense(128, activation="relu", name="dense_hidden")(x)
    x = layers.Dropout(config.DROPOUT_RATE * 0.5, name="dropout_2")(x)
    outputs = layers.Dense(1, activation="sigmoid", name="spoiled_probability")(x)

    model = Model(inputs, outputs, name="fruit_freshness_mobilenetv2")
    return model, base


def unfreeze_top_layers(base: Model, num_layers: int) -> None:
    """Unfreeze the last `num_layers` layers of the base model.

    BatchNormalization layers stay frozen. Updating their statistics on a
    small dataset usually hurts fine-tuning results.
    """
    base.trainable = True
    for layer in base.layers[:-num_layers]:
        layer.trainable = False
    for layer in base.layers:
        if isinstance(layer, layers.BatchNormalization):
            layer.trainable = False
