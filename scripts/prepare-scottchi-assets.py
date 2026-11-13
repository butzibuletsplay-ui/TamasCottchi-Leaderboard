"""Split supplied artwork without modifying originals; alpha-island assignment preserves loose details."""
from pathlib import Path
from collections import deque
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "attached_assets"
OUT = ROOT / "artifacts/tamascottchi/public/assets"
SUFFIX = "_1794587791938.png"
REPORT = {}

def split(source, category, specs):
    image = Image.open(SOURCE / (source + SUFFIX)).convert("RGBA")
    w, h = image.size
    pixels = image.load()
    # Remove the source's pure-red matte artifacts, not natural warm/red clothing.
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r > 210 and g < 28 and b < 28:
                pixels[x, y] = (r, g, b, 0)
    alpha = image.getchannel("A")
    mask = bytearray(alpha.tobytes())
    groups = [[] for _ in specs]
    for seed in range(w * h):
        if mask[seed] < 12:
            continue
        queue = deque([seed])
        mask[seed] = 0
        component = []
        while queue:
            p = queue.popleft()
            component.append(p)
            x, y = p % w, p // w
            for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0 <= nx < w and 0 <= ny < h:
                    n = ny * w + nx
                    if mask[n] >= 12:
                        mask[n] = 0
                        queue.append(n)
        if len(component) < 8:
            continue
        cx = sum(p % w for p in component) / len(component) / w
        cy = sum(p // w for p in component) / len(component) / h
        index = min(range(len(specs)), key=lambda i: (cx-specs[i][1])**2 + (cy-specs[i][2])**2)
        groups[index].extend(component)
    for (name, _, _), points in zip(specs, groups):
        if not points:
            raise RuntimeError(f"Missing sprite {name}")
        left, top = min(p%w for p in points), min(p//w for p in points)
        right, bottom = max(p%w for p in points)+1, max(p//w for p in points)+1
        selection = Image.new("L", image.size)
        selected = selection.load()
        for p in points:
            selected[p%w,p//w] = alpha.getpixel((p%w,p//w)) if pixels[p%w,p//w][3] else 0
        sprite = image.copy()
        sprite.putalpha(selection)
        sprite = sprite.crop((left,top,right,bottom))
        sprite.thumbnail((480,480), Image.Resampling.LANCZOS)
        padded = Image.new("RGBA",(sprite.width+8,sprite.height+8))
        padded.paste(sprite,(4,4))
        path = OUT / category / f"{name}.png"
        path.parent.mkdir(parents=True,exist_ok=True)
        padded.save(path,optimize=True)
        REPORT[str(path.relative_to(OUT))] = {"source":source+SUFFIX,"bounds":[left,top,right,bottom],"size":padded.size}

split("9594FB82-D911-4CFC-AD4D-0E9979DB54EA","characters",[
    ("scottchi-happy",.17,.24),("scottchi-hungry",.50,.24),("scottchi-tired",.83,.24),
    ("scottchi-dirty",.17,.73),("scottchi-sad",.50,.73),("scottchi-excited",.83,.73)])
split("32C40271-80C7-4B59-8A46-09DE49755517","clothing/hats",[
    ("baseballcap",.14,.32),("beanie",.39,.32),("party-hat",.62,.29),("crown",.86,.31),
    ("wizard-hat",.14,.70),("sleep-cap",.37,.71),("cowboy-hat",.61,.69),("bucket-hat",.86,.70)])
split("0E357A34-3407-471C-A831-99645D6C9FCB","clothing/outfits",[
    ("hoodie",.17,.18),("striped-shirt",.49,.20),("raincoat",.83,.18),
    ("scarf",.14,.51),("cape",.45,.51),("pajamas",.82,.52),
    ("tuxedo",.32,.84),("collar",.69,.85)])
split("795CAEDF-364E-4E37-B2C1-71A456687F6B","toys",[
    ("bone",.15,.30),("tennisball",.38,.33),("duck",.60,.31),("rope",.85,.30),
    ("frisbee",.14,.74),("teddy",.37,.73),("bowl",.63,.77),("shampoo",.88,.73)])
(OUT/"clothing/accessories").mkdir(parents=True,exist_ok=True)
for name in ("scarf","collar"):
    (OUT/f"clothing/outfits/{name}.png").replace(OUT/f"clothing/accessories/{name}.png")
    REPORT[f"clothing/accessories/{name}.png"] = REPORT.pop(f"clothing/outfits/{name}.png")
(OUT/"characters/scottchi-default.png").write_bytes((OUT/"characters/scottchi-happy.png").read_bytes())
for source, name in [
    ("77BD30B0-C6B9-4714-9306-8719A0C9FEE3","livingroom"),
    ("9B82046F-D4D6-4011-AB7A-C5F96D44306F","bathroom"),
    ("A64E6A7D-6AA2-414C-91BA-B8063B96283F","bedroom"),
    ("F4FAE942-55A2-4609-9EF4-5B1EA65ECFF8","playroom")]:
    im = Image.open(SOURCE/(source+SUFFIX))
    im.thumbnail((1280,720),Image.Resampling.LANCZOS)
    (OUT/"backgrounds").mkdir(parents=True,exist_ok=True)
    im.quantize(colors=256).save(OUT/f"backgrounds/{name}.png",optimize=True)
    im.save(OUT/f"backgrounds/{name}.webp",quality=85,method=6)
(OUT/"ui").mkdir(parents=True,exist_ok=True)
(OUT/"asset-sources.json").write_text(json.dumps(REPORT,indent=2))
print(f"Prepared {len(REPORT)} transparent sprites; original sources untouched.")
