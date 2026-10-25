"""Optional Kaggle download helper. Credentials are NEVER hardcoded: use the
Kaggle CLI with ~/.kaggle/kaggle.json or KAGGLE_USERNAME/KAGGLE_KEY env vars.

Manual alternative (no CLI needed): open
  https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents
download US_Accidents_March23.csv and place it at data/raw/US_Accidents_March23.csv.
The file is several GB -- it is NOT downloaded automatically on app startup
and is excluded from git (see .gitignore).
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "raw"


def main() -> int:
    if shutil.which("kaggle") is None:
        print("Kaggle CLI not found. Install it (pip install kaggle) and authenticate, "
              "or download manually from https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents")
        return 2
    DEST.mkdir(parents=True, exist_ok=True)
    cmd = ["kaggle", "datasets", "download", "sobhanmoosavi/us-accidents", "-p", str(DEST), "--unzip"]
    print("Running:", " ".join(cmd))
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())
