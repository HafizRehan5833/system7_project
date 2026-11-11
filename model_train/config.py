
from pathlib import Path

# Project root is one level above model_train/
BASE_DIR = Path(__file__).resolve().parent.parent

# Dataset locations
DATA_DIR = BASE_DIR / "dataset"
RAW_DIR = DATA_DIR / "raw"
TRAIN_DIR = DATA_DIR / "train"
VAL_DIR = DATA_DIR / "val"
TEST_DIR = DATA_DIR / "test"

# Output locations
MODEL_DIR = BASE_DIR / "model_train" / "saved_models"
BEST_MODEL_NAME = "fruit_freshness_model.keras"
HISTORY_NAME = "training_history.json"
EVAL_REPORT_NAME = "evaluation_report.json"
CONFUSION_MATRIX_NAME = "confusion_matrix.png"

CLASS_NAMES = ["fresh", "spoiled"]

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
SEED = 42
VAL_SPLIT = 0.15
TEST_SPLIT = 0.15

# Model
DROPOUT_RATE = 0.4          
EPOCHS_HEAD = 10           
EPOCHS_FINE = 15           
LR_HEAD = 1e-3
LR_FINE = 1e-5
FINE_TUNE_LAYERS = 40        
