"""Raster export only for favicon/social compatibility. The source art remains SVG.
Requirements: CairoSVG. No font files or remote resources are used.
"""
from pathlib import Path
import json, hashlib
import cairosvg
root=Path(__file__).resolve().parents[1]/'public/veil'
for source,dest,w,h in [('social-card.svg','social-card.png',1200,630),('favicon.svg','favicon-32.png',32,32),('favicon.svg','touch-icon.png',180,180)]:
    cairosvg.svg2png(url=str(root/source),write_to=str(root/dest),output_width=w,output_height=h)
m=json.loads((root/'manifest.json').read_text());m['assets']=[]
for f in sorted(root.rglob('*')):
    if f.is_file() and f.name!='manifest.json':m['assets'].append({'path':str(f.relative_to(root)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(root/'manifest.json').write_text(json.dumps(m,indent=2))
print('Production asset count:',len(m['assets']))
