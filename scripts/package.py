"""Create a deterministic upload ZIP and verify extraction before browser QA."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

root = Path('release/crazygames')
target = Path('release/street-memory-crazygames-basic.zip')
assert (root / 'index.html').is_file()
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(root.rglob('*')):
        if not path.is_file():
            continue
        entry = zipfile.ZipInfo(path.relative_to(root).as_posix(), (2026, 11, 10, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o644 << 16
        archive.writestr(entry, path.read_bytes())

with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    assert 'index.html' in archive.namelist()
    unpacked = Path('/tmp/street-memory-zip-review')
    shutil.rmtree(unpacked, ignore_errors=True)
    unpacked.mkdir(exist_ok=True)
    archive.extractall(unpacked)

files = [path for path in root.rglob('*') if path.is_file()]
manifest = {
    'zipBytes': target.stat().st_size,
    'bundleBytes': sum(path.stat().st_size for path in files),
    'fileCount': len(files),
    'zipSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    'files': [
        {
            'path': str(path.relative_to(root)),
            'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        }
        for path in sorted(files)
    ],
}
Path('release/metadata/package-audit.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
