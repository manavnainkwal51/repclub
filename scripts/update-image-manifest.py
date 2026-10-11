from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'dist'
images=sorted(str(p.relative_to(root)) for p in (root/'exercise-images').glob('*.webp'))
(root/'image-assets.json').write_text(json.dumps(images,separators=(',',':'))+'\n')
print(f'Offline image manifest: {len(images)} images')
