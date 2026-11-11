

from io import BytesIO

import numpy as np
from PIL import Image, UnidentifiedImageError

from config import IMG_SIZE


def preprocess_image_bytes(data: bytes) -> np.ndarray:
    """Decode raw image bytes into a batch of one image.

    Args:
        data: Raw bytes of an uploaded image file.

    Returns:
        A float32 array with shape (1, height, width, 3).

    Raises:
        ValueError: If the bytes are not a valid image.
    """
    try:
        image = Image.open(BytesIO(data)).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("The uploaded file is not a valid image.") from exc

    image = image.resize(IMG_SIZE, Image.Resampling.BILINEAR)
    array = np.asarray(image, dtype=np.float32)
    return np.expand_dims(array, axis=0)
