"""Run the full pipeline: split dataset -> train model -> evaluate.

Usage:
    python run_all.py
"""

import subprocess
import sys
import os

# Change to the model_train directory so imports work
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def run_step(description: str, script: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {description}")
    print(f"{'='*60}\n")
    result = subprocess.run([sys.executable, script], check=False)
    if result.returncode != 0:
        print(f"\nERROR: {script} failed with exit code {result.returncode}")
        sys.exit(result.returncode)


if __name__ == "__main__":
    run_step("Step 1/3: Splitting dataset into train/val/test", "split_dataset.py")
    run_step("Step 2/3: Training the model (Phase 1: head, Phase 2: fine-tune)", "train.py")
    run_step("Step 3/3: Evaluating on the test set", "evaluate.py")
    print(f"\n{'='*60}")
    print("  ALL DONE! Check model_train/saved_models/ for results.")
    print(f"{'='*60}")

