"""Prepare the supplied Scottchi 3.0 artwork; source uploads remain untouched."""
from pathlib import Path
from collections import deque
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
src = ROOT / "attached_assets"
out = ROOT / "artifacts/tamascottchi/public/assets"
items = Image.open(src / "1DCD2006-9272-4C0F-9786-A19140E4CE02_1794593135603.png").convert("RGBA")
names = [
    ["cap-red", "beanie-dark", "cowboy-star", "crown-ruby", "wizard-purple", "chef-hat", "party-cone", "sleep-cap-blue", "ranger-cap", "crown-gold"],
    ["hoodie-dark", "raincoat-gold", "varsity-jacket", "tuxedo", "hero-cape-blue", "sweater-cream", "shirt-floral", "explorer-jacket", "royal-cape", "royal-armor"],
    ["scarf-red", "scarf-blue", "scarf-green", "scarf-purple", "collar-bone", "collar-spikes", "collar-gem", "bandana", "harness-blue", "wings-gold"],
    ["glasses-dark", "monocle", "glasses-square", "snorkel-goggles", "heart-glasses", "spiral-glasses", "headphones", "halo", "wings-white", "devil-horns"],
    ["bone-cream", "tennisball-green", "frisbee-red", "rope-red", "duck", "teddy", "shark-plush", "burger", "gamepad", "bone-magic"],
    ["bowl", "bottle-pink", "cheese", "brush", "mud-pile", "paper-roll", "leek", "crystal-rainbow", "clover", "key-gold"],
    ["egg-common", "egg-galaxy", "egg-crystal", "egg-lava", "gem-flower", "egg-wings", "portal-orb", "treasure-chest", "bell-trophy", "scottchi-statue"],
]
W, H = items.size
(out / "collections/items").mkdir(parents=True, exist_ok=True)
cell_w, cell_h = W / 10, H / len(names)

def remove_checkerboard(cell):
    """Remove only edge-connected neutral checker pixels; preserve outlined artwork."""
    pixels = cell.load()
    width, height = cell.size
    background = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            r, g, b, _ = pixels[x, y]
            if min(r, g, b) >= 235 and max(r, g, b) - min(r, g, b) <= 8:
                background[y * width + x] = 1
    exterior = bytearray(width * height)
    queue = deque()
    for x in range(width):
        queue.extend((x, (height - 1) * width + x))
    for y in range(height):
        queue.extend((y * width, y * width + width - 1))
    while queue:
        index = queue.popleft()
        if exterior[index] or not background[index]:
            continue
        exterior[index] = 1
        x, y = index % width, index // width
        if x: queue.append(index - 1)
        if x + 1 < width: queue.append(index + 1)
        if y: queue.append(index - width)
        if y + 1 < height: queue.append(index + width)
    result = cell.copy()
    out_pixels = result.load()
    for index, is_background in enumerate(exterior):
        if is_background:
            out_pixels[index % width, index // width] = (*pixels[index % width, index // width][:3], 0)
    # Some sheet drawings slightly cross their nominal cell borders. Keep the
    # main centered sprite and nearby accents, not the neighbor's clipped edge.
    visible = result.load()
    unseen = bytearray(width * height)
    components = []
    for start in range(width * height):
        if unseen[start] or visible[start % width, start // width][3] == 0:
            continue
        queue.append(start)
        unseen[start] = 1
        points = []
        while queue:
            index = queue.popleft()
            points.append(index)
            x, y = index % width, index // width
            for ny in range(max(0, y-1), min(height, y+2)):
                for nx in range(max(0, x-1), min(width, x+2)):
                    neighbor = ny * width + nx
                    if not unseen[neighbor] and visible[nx, ny][3] > 0:
                        unseen[neighbor] = 1
                        queue.append(neighbor)
        if len(points) > 12:
            cx = sum(point % width for point in points) / len(points)
            cy = sum(point // width for point in points) / len(points)
            components.append((len(points), cx, cy, points))
    if not components:
        return result
    main = max(components, key=lambda part: part[0])
    for size, cx, cy, points in components:
        if size == main[0] or (cx-main[1])**2 + (cy-main[2])**2 < 30**2:
            continue
        else:
            for point in points:
                visible[point % width, point // width] = (*visible[point % width, point // width][:3], 0)
    return result

for row, names_row in enumerate(names):
    for col, name in enumerate(names_row):
        cell = items.crop((round(col * cell_w), round(row * cell_h), round((col+1)*cell_w), round((row+1)*cell_h)))
        if items.getchannel("A").getextrema()[0] < 255:
            pass
        else:
            cell = remove_checkerboard(cell)
        box = cell.getbbox()
        if box:
            cell = cell.crop(box)
        pad = Image.new("RGBA", (cell.width+8, cell.height+8), (0, 0, 0, 0))
        pad.alpha_composite(cell, (4, 4))
        pad.save(out / f"collections/items/{name}.png", optimize=True)

map_image = Image.open(src / "EDC70B75-3579-468F-AB4F-E98A219A4336_1794593135603.png")
(out / "world").mkdir(parents=True, exist_ok=True)
map_image.save(out / "world/scottchi-world-map.png", optimize=True)
map_image.thumbnail((1400, 1000), Image.Resampling.LANCZOS)
map_image.save(out / "world/scottchi-world-map.webp", "WEBP", quality=86, method=6)
visit = Image.open(src / "D3392C39-0236-4FBC-B52D-D93961CBD0FC_1794593135603.png")
visit.thumbnail((1200, 800), Image.Resampling.LANCZOS)
(out / "online").mkdir(parents=True, exist_ok=True)
visit.save(out / "online/friend-visit.webp", "WEBP", quality=84, method=6)
print(f"Prepared {sum(map(len,names))} crops. Source is unchanged; edge-connected checkerboard pixels were removed from the derived transparent sprites.")
