"""Download the labeled HDFS_v1 dataset from the official LogHub Zenodo record."""
from pathlib import Path
from urllib.request import urlretrieve
import zipfile

OUT = Path(__file__).resolve().parents[1] / "data" / "loghub"
URL = "https://zenodo.org/records/8196385/files/HDFS_v1.zip?download=1"

def main() -> None:
    """Fetch and extract HDFS_v1; dataset is intentionally not vendored in Git."""
    OUT.mkdir(parents=True, exist_ok=True)
    archive = OUT / "HDFS_v1.zip"
    if not archive.exists():
        print(f"Downloading ~187 MB from {URL}")
        urlretrieve(URL, archive)
    with zipfile.ZipFile(archive) as bundle:
        bundle.extractall(OUT)
    print(f"Dataset extracted under {OUT}")

if __name__ == "__main__":
    main()
