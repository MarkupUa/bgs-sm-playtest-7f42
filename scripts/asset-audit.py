"""Check cover dimensions/opacity and real preview encoding, duration and silence."""
from pathlib import Path
from PIL import Image
import json
import subprocess

results = []
for name, size in [('landscape', (1920, 1080)), ('portrait', (800, 1200)), ('square', (800, 800))]:
    path = Path('release/covers') / (name + '.png')
    image = Image.open(path)
    assert image.size == size and image.format == 'PNG'
    assert image.convert('RGBA').getchannel('A').getextrema() == (255, 255)
    results.append({
        'path': str(path), 'size': list(image.size), 'format': image.format,
        'opaque': True, 'bytes': path.stat().st_size,
    })

for name, size in [('landscape', (1920, 1080)), ('portrait', (1080, 1620))]:
    path = Path('release/previews') / (name + '.mp4')
    info = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', str(path),
    ]))
    video = info['streams'][0]
    assert len(info['streams']) == 1 and video['codec_type'] == 'video'
    assert video['codec_name'] == 'h264' and (video['width'], video['height']) == size
    assert 15 <= float(info['format']['duration']) <= 20
    assert path.stat().st_size < 50 * 1024 * 1024
    results.append({
        'path': str(path), 'size': list(size), 'codec': video['codec_name'],
        'duration': info['format']['duration'], 'audioTracks': 0, 'bytes': path.stat().st_size,
    })

Path('release/metadata/asset-audit.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
