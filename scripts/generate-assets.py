"""Build production VEIL assets. No remote requests. No bitmap screenshot UI.
Usage: python scripts/generate-assets.py --portrait /path/to/approved-512px.png
Requirements: Pillow. All procedural SVG geometry is authored for this project.
"""
from pathlib import Path
import argparse, math, random, json, hashlib
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/veil'
OUT.mkdir(parents=True, exist_ok=True)
p = argparse.ArgumentParser(); p.add_argument('--portrait', required=True); args = p.parse_args()

def save(name, data):
    (OUT/name).parent.mkdir(parents=True, exist_ok=True)
    (OUT/name).write_text(data, encoding='utf-8')

def svg(body, view='0 0 400 200', label='VEIL decorative asset'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" fill="none"><title>{label}</title>{body}</svg>'
# Original, hand-drawn serif letterforms: no text/font embedding.
mark = '''<g fill="currentColor">
<path d="M0 5H28V7H20L43 65L64 12Q66 7 57 7V5H78V7Q70 7 68 13L43 77H40L10 7H0Z"/>
<path d="M105 5H159L161 21H159Q156 8 147 8H124V38H139Q148 38 148 29H150V50H148Q148 41 139 41H124V73H149Q159 73 162 58H164L162 76H105V74H114V7H105Z"/>
<path d="M193 5H224V7H214V74H224V76H193V74H203V7H193Z"/>
<path d="M254 5H286V7H275V73H298Q307 73 311 56H313L311 76H254V74H264V7H254Z"/>
</g>'''
save('wordmark.svg', svg(mark.replace('currentColor','#e5dfd3'),'0 0 314 82','VEIL'))
save('wordmark-dark.svg', svg(mark.replace('currentColor','#171717'),'0 0 314 82','VEIL'))
monogram='<path d="M24 24H47V27H42L66 88L90 31Q92 27 85 27V24H107V27Q99 27 96 34L66 110H61L30 27H24Z" fill="#d0c6b6"/>'
save('monogram.svg',svg(monogram,'0 0 132 132','VEIL monogram'))
save('favicon.svg',svg('<rect width="132" height="132" rx="26" fill="#151515"/>'+monogram,'0 0 132 132','VEIL'))
# Embossed seal. Neutral RGB values only; decoration is genuine scalable geometry.
pts=[]
for i in range(128):
    a=i*2*math.pi/128
    r=93+2.5*math.sin(a*11)+1.1*math.sin(a*17)
    pts.append(f'{110+r*math.cos(a):.2f},{110+r*math.sin(a):.2f}')
seal_defs='''<defs>
<linearGradient id="wax" x1="28" y1="15" x2="187" y2="208" gradientUnits="userSpaceOnUse"><stop stop-color="#727272"/><stop offset=".11" stop-color="#303030"/><stop offset=".4" stop-color="#111111"/><stop offset=".76" stop-color="#242424"/><stop offset="1" stop-color="#080808"/></linearGradient>
<linearGradient id="rim" x1="20" y1="20" x2="180" y2="190" gradientUnits="userSpaceOnUse"><stop stop-color="#b4b4b4"/><stop offset=".3" stop-color="#424242"/><stop offset=".55" stop-color="#161616"/><stop offset=".82" stop-color="#898989"/><stop offset="1" stop-color="#242424"/></linearGradient>
<radialGradient id="face" cx=".3" cy=".2" r=".9"><stop stop-color="#343434"/><stop offset="1" stop-color="#101010"/></radialGradient>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#000" flood-opacity=".8"/></filter>
</defs>'''
seal=seal_defs+f'<g filter="url(#shadow)"><polygon points="{" ".join(pts)}" fill="url(#wax)" stroke="url(#rim)" stroke-width="2"/><circle cx="110" cy="110" r="79" stroke="url(#rim)" stroke-width="4"/><circle cx="110" cy="110" r="72" fill="url(#face)" stroke="#626262"/><circle cx="110" cy="110" r="54" stroke="#515151" stroke-width=".8"/></g>'
for i in range(48):
    a=i*math.pi/24
    x,y=110+62*math.cos(a),110+62*math.sin(a)
    seal+=f'<path d="M{x:.2f} {y:.2f}l{3*math.cos(a):.2f} {3*math.sin(a):.2f}" stroke="#666" stroke-width=".7"/>'
seal+='<path d="M78 72H99V74H94L115 130L134 80Q136 74 128 74V72H147V74Q141 74 138 81L114 145H110L83 74H78Z" fill="#919191"/><path d="M86 156H136" stroke="#515151" stroke-width=".7"/>'
save('wax-seal.svg', svg(seal,'0 0 220 220','VEIL embossed wax seal'))
# Envelope: faceted folds + edge highlights, intentionally no raster blur.
env='''<defs>
<linearGradient id="paper" x1="80" y1="20" x2="360" y2="400" gradientUnits="userSpaceOnUse"><stop stop-color="#333"/><stop offset=".5" stop-color="#1b1b1b"/><stop offset="1" stop-color="#101010"/></linearGradient>
<linearGradient id="flap" x1="310" y1="50" x2="310" y2="285" gradientUnits="userSpaceOnUse"><stop stop-color="#323232"/><stop offset="1" stop-color="#171717"/></linearGradient>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" stitchTiles="stitch" seed="31"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".1"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter>
</defs>
<rect x="21" y="55" width="598" height="335" rx="2" fill="url(#paper)" stroke="#464646"/>
<path d="M22 389L292 169Q320 148 348 170L618 389Z" fill="#1d1d1d" stroke="#383838"/>
<path d="M22 56L319 267L618 56Z" fill="#090909" opacity=".8" transform="translate(0 9)"/>
<path d="M22 56H618L338 262Q320 275 302 262Z" fill="url(#flap)" stroke="#515151" stroke-width="1.2"/>
<path d="M22 56H618" stroke="#747474" stroke-opacity=".55"/>
<path d="M23 57L302 262Q320 275 338 262L617 57" stroke="#111" stroke-opacity=".9"/>
<rect x="22" y="56" width="596" height="333" fill="#777" opacity=".1" filter="url(#grain)"/>
'''
# An integral path wordmark on envelope, not raster text.
env+='<g transform="translate(247 104) scale(.47)" opacity=".75">'+mark.replace('currentColor','#d3ccbf')+'</g>'
env+='<path d="M270 162H370" stroke="#5a5a5a" stroke-width=".7"/>'
save('envelope.svg', svg(env,'0 0 640 420','VEIL sealed correspondence envelope'))
# Archival document with blank editable area. Dossier redactions are intentional decoration.
paper='''<defs><linearGradient id="p" x1="0" y1="0" x2="480" y2="640" gradientUnits="userSpaceOnUse"><stop stop-color="#d2c8b7"/><stop offset=".55" stop-color="#bfb4a2"/><stop offset="1" stop-color="#a99e8c"/></linearGradient><pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 9L9 0" stroke="#443b2e" stroke-opacity=".06" stroke-width=".5"/></pattern></defs>
<path d="M10 7L124 9L238 5L368 10L470 7L474 159L470 311L475 489L470 631L327 627L196 632L80 628L8 631L5 468L10 318L7 156Z" fill="url(#p)"/>
<path d="M23 26H454V612H23Z" stroke="#51493d" stroke-opacity=".4"/>
<path d="M10 313L470 316M240 8L244 630" stroke="#fff" stroke-opacity=".1"/>
<rect x="11" y="11" width="457" height="613" fill="url(#hatch)"/>
<path d="M47 72H288M47 85H180M47 117H430" stroke="#51493d" stroke-opacity=".4"/>
<path d="M46 153H278V166H46ZM46 180H351V193H46ZM46 207H225V220H46Z" fill="#2c2925"/>
<g stroke="#665b4b" stroke-opacity=".28">'''
for y in range(259,570,19): paper+=f'<path d="M46 {y}H430"/>'
paper+='</g><circle cx="379" cy="73" r="24" stroke="#685c4a" stroke-opacity=".4"/><circle cx="379" cy="73" r="19" stroke="#685c4a" stroke-opacity=".3"/>'
save('archival-paper.svg',svg(paper,'0 0 480 640','VEIL archival document texture'))
save('vellum.svg',svg('''<defs><linearGradient id="v"><stop stop-color="#aaa" stop-opacity=".08"/><stop offset=".48" stop-color="#fff" stop-opacity=".12"/><stop offset=".52" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#999" stop-opacity=".03"/></linearGradient></defs><path d="M9 3L393 9L397 548L4 555Z" fill="url(#v)" stroke="#b0b0b0" stroke-opacity=".2"/><path d="M200 7L207 551" stroke="#fff" stroke-opacity=".08"/>''','0 0 400 560','Translucent vellum overlay'))
save('archive-grid.svg',svg('''<defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" stroke="#aaa" stroke-opacity=".12" stroke-width=".7"/></pattern></defs><rect width="800" height="800" fill="url(#g)"/>''','0 0 800 800','Archive registration grid'))
save('registration.svg',svg('<path d="M0 12H24M12 0V24" stroke="#c6bdaf" stroke-width=".7"/><circle cx="12" cy="12" r="5" stroke="#c6bdaf" stroke-width=".5"/>','0 0 24 24','Registration mark'))
save('divider.svg',svg('<path d="M0 2H800" stroke="#4d4d4d" stroke-width=".6"/><path d="M0 2H50" stroke="#cfc6b7"/>','0 0 800 4','VEIL section rule'))
save('redaction.svg',svg('<path d="M3 3L257 1L255 24L1 27Z" fill="#151515"/><path d="M5 30L180 29L179 39L2 42Z" fill="#151515" opacity=".7"/>','0 0 260 44','Decorative redaction bars'))
# Hero portrait remains native-resolution: 512px -> <=256 CSS px at DPR2.
im=Image.open(args.portrait).convert('L').convert('RGB')
w,h=im.size
im.save(OUT/'portrait-512.webp',quality=95,method=6)
im.resize((w//2,h//2),Image.Resampling.LANCZOS).save(OUT/'portrait-256.webp',quality=95,method=6)
# Repeating grayscale texture, not full-page filtered RGB noise.
rng=random.Random(4089)
grain=Image.new('RGBA',(192,192)); px=[]
for i in range(192*192):
    gray=255 if rng.random()>.5 else 0
    px.append((gray,gray,gray,rng.randint(0,12)))
grain.putdata(px); grain.save(OUT/'paper-grain.png',optimize=True)
# Icons: two exact Lucide path sets, plus original simple geometry, same stroke/grid.
icons={
'shield-check':'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
'eye-off':'<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
'arrow-up-right':'<path d="M6 18L18 6M7 6H18V17"/>',
'arrow-right':'<path d="M4 12H20M14 6L20 12L14 18"/>',
'arrow-down':'<path d="M12 3V21M6 15L12 21L18 15"/>',
'check':'<path d="M5 12L10 17L20 6"/>',
'close':'<path d="M6 6L18 18M6 18L18 6"/>',
'plus':'<path d="M12 4V20M4 12H20"/>',
'clock':'<circle cx="12" cy="12" r="9"/><path d="M12 6V12L16 14"/>',
'person':'<circle cx="12" cy="7" r="3.5"/><path d="M4 21V18Q4 13 12 13Q20 13 20 18V21Z"/>',
'users':'<circle cx="9" cy="7" r="3"/><path d="M2 21V18Q2 13 9 13Q16 13 16 18V21M16 4Q21 4 21 8Q21 11 18 11M20 14Q23 16 22 21"/>',
'shield':'<path d="M12 2Q17 6 21 5V12Q21 19 12 22Q3 19 3 12V5Q7 6 12 2Z"/>',
'lock':'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6A4 4 0 0 1 8 6.01M8 6A4 4 0 0 1 16 6V10M12 14V17"/>',
'briefcase':'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3H16V7M3 12H21M10 12V15H14V12"/>',
'code':'<path d="M8 5L2 12L8 19M16 5L22 12L16 19M14 3L10 21"/>',
'cube':'<path d="M12 2L22 7V17L12 22L2 17V7ZM2 7L12 12L22 7M12 12V22M7 4.5L17 9.5"/>',
'link':'<path d="M9 8L12 5Q17 0 21 5Q24 9 19 13L16 16M15 16L12 19Q7 24 3 19Q0 15 5 11L8 8M8 16L16 8"/>',
'root':'<circle cx="12" cy="5" r="3"/><circle cx="5" cy="20" r="2"/><circle cx="19" cy="20" r="2"/><path d="M12 8V12M5 18V12H19V18"/>',
'receipt':'<path d="M5 2H19V22L15 20L12 22L9 20L5 22ZM8 7H16M8 11H16M8 15H12"/>',
'revoke':'<circle cx="12" cy="12" r="9"/><path d="M6 6L18 18"/>',
'chevron':'<path d="M5 9L12 16L19 9"/>',
'copy':'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 5V3H3V16H5"/>',
'info':'<circle cx="12" cy="12" r="9"/><path d="M12 11V17M12 7V7.2"/>',
'fingerprint':'<path d="M4 11C4 0 20 0 20 11M7 18V11C7 4 17 4 17 11V15M10 20V11C10 8 14 8 14 11V15Q14 20 18 21M4 15V19M21 15Q21 18 22 19"/>'
}
# Fix lock path (one continuous shackle).
icons['lock']='<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6A4 4 0 0 1 16 6V10M12 14V17"/>'
sprite='<svg xmlns="http://www.w3.org/2000/svg"><defs>'
for name,body in icons.items():
    source='Lucide Icons; ISC, see docs/DESIGN-SOURCES.md' if name in ('eye-off','shield-check') else 'Original VEIL geometry'
    save(f'icons/{name}.svg',f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><!-- {source} -->{body}</svg>')
    sprite+=f'<symbol id="{name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{body}</symbol>'
sprite+='</defs></svg>';save('icons.svg',sprite)
# TypeScript icon geometry for network-free inline SVG use.
(ROOT/'src/landing/icon-paths.ts').write_text('// Generated by scripts/generate-assets.py. Two Lucide icons; notices in docs/DESIGN-SOURCES.md.\nexport const iconPaths = '+json.dumps(icons,indent=2)+' as const;\nexport type IconName = keyof typeof iconPaths;\n')
# A crisp topology diagram is illustrative, not a public-network status graphic.
topo='<circle cx="320" cy="67" r="38" fill="#202020" stroke="#8b8378"/><path d="M320 105V157M90 204V157H550V204M320 157V204" stroke="#6e675d"/>'
topo+='<g transform="translate(299 42) scale(.32)">'+mark.split('</g>')[0].split('<g fill="currentColor">')[1].split('<path d="M105')[0].replace('currentColor','#cfc6b7')+'</g>' if False else ''
for x in [90,320,550]:
    topo+=f'<rect x="{x-62}" y="204" width="124" height="76" rx="3" fill="#1b1b1b" stroke="#484848"/><path d="M{x-32} 231H{x+32}M{x-22} 244H{x+22}" stroke="#a49b8d"/><path d="M{x-16} 258H{x+16}" stroke="#535353"/>'
save('context-map.svg',svg(topo,'0 0 640 320','One private root with three separate contexts'))
# Web app sharing graphic: original vector artwork, no external font file.
og='<rect width="1200" height="630" fill="#111"/><path d="M64 80H1136M64 550H1136" stroke="#383838"/><g transform="translate(70 117) scale(1.5)">'+mark.replace('currentColor','#ded5c6')+'</g><path d="M72 327H518M72 348H421" stroke="#777"/><g transform="translate(706 99) scale(1.75)">'+seal+'</g><path d="M70 420H390" stroke="#cec3b0" stroke-width="4"/>'
save('social-card.svg',svg(og,'0 0 1200 630','VEIL — privacy by design'))
manifest={"version":"1.0.0","rasterPolicy":"No upscale. Native 512x512 portrait displayed at a maximum of 256 CSS px at DPR2.","sourcePortrait":{"name":Path(args.portrait).name,"width":w,"height":h,"provenance":"User-provided VEIL concept, reused, not newly generated"},"fontFilesIncluded":False,"assets":[]}
for f in sorted(OUT.rglob('*')):
    if f.is_file(): manifest['assets'].append({'path':str(f.relative_to(OUT)), 'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
save('manifest.json',json.dumps(manifest,indent=2))
print(f'Created {len(manifest["assets"])} assets, {sum(a["bytes"] for a in manifest["assets"]):,} bytes')
