"""Split raw images into train, validation, and test folders.

Expected input (actual dataset structure):
    dataset/FreshApple/*.png
    dataset/FreshBanana/*.png
    ...
    dataset/RottenApple/*.png
    dataset/RottenBanana/*.png
    ...

Maps all Fresh* folders -> "fresh" class
Maps all Rotten* folders -> "spoiled" class

Produced output:
    dataset/train/{fresh,spoiled}/
    dataset/val/{fresh,spoiled}/
    dataset/test/{fresh,spoiled}/
"""

import logging
import random
import shutil
from pathlib import Path
from typing import List

import config

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def collect_images_from_multiple_dirs(base_dir: Path, prefix: str) -> List[Path]:
    """Return all image files from all subdirectories matching the given prefix."""
    all_images: List[Path] = []
    for sub_dir in sorted(base_dir.iterdir()):
        if sub_dir.is_dir() and sub_dir.name.startswith(prefix):
            images = sorted(
                p for p in sub_dir.iterdir()
                if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
            )
            all_images.extend(images)
            logger.info("  Found %d images in %s", len(images), sub_dir.name)
    return all_images


def split_class(class_name: str, prefix: str) -> None:
    """Shuffle one class and copy its images into train/val/test folders."""
    logger.info("Collecting '%s' images (prefix='%s')...", class_name, prefix)
    images = collect_images_from_multiple_dirs(config.DATA_DIR, prefix)
    if not images:
        raise ValueError(f"No images found for class '{class_name}' with prefix '{prefix}'")

    logger.info("Total '%s' images: %d", class_name, len(images))
    random.Random(config.SEED).shuffle(images)

    n_total = len(images)
    n_test = int(n_total * config.TEST_SPLIT)
    n_val = int(n_total * config.VAL_SPLIT)

    splits = {
        "test": images[:n_test],
        "val": images[n_test:n_test + n_val],
        "train": images[n_test + n_val:],
    }

    for split_name, files in splits.items():
        destination = config.DATA_DIR / split_name / class_name
        destination.mkdir(parents=True, exist_ok=True)
        for file_path in files:
            # Prefix source folder name to avoid filename collisions
            new_name = f"{file_path.parent.name}_{file_path.name}"
            shutil.copy2(file_path, destination / new_name)
        logger.info("  %-5s | %-8s | %d images", split_name, class_name, len(files))


# Mapping from class name to the prefix used in folder names
CLASS_PREFIX_MAP = {
    "fresh": "Fresh",
    "spoiled": "Rotten",
}


def main() -> None:
    # Remove old splits so results are not mixed with a previous run
    for split_name in ("train", "val", "test"):
        split_dir = config.DATA_DIR / split_name
        if split_dir.exists():
            shutil.rmtree(split_dir)

    for class_name in config.CLASS_NAMES:
        prefix = CLASS_PREFIX_MAP[class_name]
        split_class(class_name, prefix)

    # Print summary
    for split_name in ("train", "val", "test"):
        split_dir = config.DATA_DIR / split_name
        for class_name in config.CLASS_NAMES:
            class_dir = split_dir / class_name
            count = len(list(class_dir.iterdir())) if class_dir.exists() else 0
            logger.info("Summary: %s/%s = %d images", split_name, class_name, count)

    logger.info("Dataset split complete.")


if __name__ == "__main__":
    main()
