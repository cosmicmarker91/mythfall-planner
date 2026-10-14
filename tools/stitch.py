#!/usr/bin/env python3
"""Stitches the high-res screenshots in source/hq/*.png into tiled WebP layers
(public/assets/tiles/) and rewrites the "layers" of public/data/tree.json.

All screenshots share one zoom level, so they are registered by pure translation:
SIFT gives a rough offset against the old low-res composite (source/reg-sift.json),
then each image is refined by integer-pixel template matching against the mosaic.
UI debris (cursor, Reset/Close buttons, title, counter, window frame) is masked out.
"""
import json, sys, pathlib, numpy as np, cv2
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from lib_world import ROOT, lowres_base

tree = json.loads((ROOT/"source/tree.lowres.json").read_text())
W, H = tree["world"]["width"], tree["world"]["height"]
R = 1 / 0.44922            # hq px per world px
reg = json.loads((ROOT/"source/reg-sift.json").read_text())
FRAME = 14                 # px of game-window frame to drop from every edge
# UI debris per image: (x0, y0, x1, y1) in that screenshot's own pixels
MASKS = {1: [(0, 0, 70, 80)], 3: [(0, 1540, 130, 1722), (3000, 60, 3130, 160)],
         4: [(650, 0, 1030, 135), (2215, 0, 2522, 90)], 7: [(0, 0, 370, 115), (1290, 0, 1670, 125)]}

imgs, valid, pos = {}, {}, {}
for i in range(1, 8):
    im = cv2.imread(str(ROOT/f"source/hq/{i}.png"), cv2.IMREAD_COLOR)
    h, w = im.shape[:2]
    m = np.zeros((h, w), np.uint8); m[FRAME:h-FRAME, FRAME:w-FRAME] = 255
    for x0, y0, x1, y1 in MASKS.get(i, []): m[y0:y1, x0:x1] = 0
    imgs[i], valid[i] = im, m
    M = np.array(reg[str(i)]); pos[i] = (round(M[0, 2] * R), round(M[1, 2] * R))   # canvas top-left (SIFT estimate)

CW, CH = round(W*R), round(H*R)
# ---- refine offsets sequentially against the growing mosaic ----
mosaic = np.zeros((CH + 2500, CW + 2500), np.uint8); mvalid = np.zeros_like(mosaic)
def paste_gray(i, p):
    g = cv2.cvtColor(imgs[i], cv2.COLOR_BGR2GRAY); h, w = g.shape; x, y = p
    sl = (slice(y, y+h), slice(x, x+w)); sel = (valid[i] > 0) & (mvalid[sl] == 0)
    mosaic[sl][sel] = g[sel]; mvalid[sl][sel] = 255
def overlap(i, p):
    h, w = valid[i].shape; x, y = p
    return int(np.count_nonzero(mvalid[y:y+h, x:x+w] & valid[i]))
order = [1]; paste_gray(1, pos[1]); rest = set(range(2, 8))
while rest:
    i = max(rest, key=lambda k: overlap(k, pos[k])); rest.remove(i)
    h, w = valid[i].shape; x, y = pos[i]; g = cv2.cvtColor(imgs[i], cv2.COLOR_BGR2GRAY)
    ov = (mvalid[y:y+h, x:x+w] & valid[i]) > 0
    ys, xs = np.where(ov)
    if len(ys) < 5000: print("warning: little overlap for", i); paste_gray(i, pos[i]); continue
    # template = overlap bbox shrunk a little; search +-8 px
    ty0, ty1, tx0, tx1 = ys.min()+10, ys.max()-10, xs.min()+10, xs.max()-10
    tpl = g[ty0:ty1, tx0:tx1].astype(np.float32)
    S = 8; win = mosaic[max(0, y+ty0-S):y+ty1+S, max(0, x+tx0-S):x+tx1+S].astype(np.float32)
    r = cv2.matchTemplate(win, tpl, cv2.TM_CCOEFF_NORMED); _, mx, _, loc = cv2.minMaxLoc(r)
    dx = loc[0] - (S if x+tx0-S >= 0 else x+tx0); dy = loc[1] - (S if y+ty0-S >= 0 else y+ty0)
    pos[i] = (x + dx, y + dy); print(f"image {i}: shift ({dx},{dy}) corr {mx:.3f} overlap {len(ys)} px")
    paste_gray(i, pos[i])

# ---- compose ----
# Details (text, icons) come from whichever screenshot is furthest from its own border (hard seam);
# the soft background fog is blended smoothly across seams so exposure differences don't show.
canvas = np.zeros((CH, CW, 3), np.uint8); best = np.zeros((CH, CW), np.float32); cover = np.zeros((CH, CW), bool)
owner = np.full((CH, CW), -1, np.int8)
D = 8; sh, sw = CH // D + 1, CW // D + 1
def to_small(arr_roi, x0, y0, x1, y1):    # place ROI at (x0,y0) into a full-size zero canvas, shrink by D
    full = np.zeros((CH, CW) + arr_roi.shape[2:], np.float32); full[y0:y1, x0:x1] = arr_roi
    return cv2.resize(full, (sw, sh), interpolation=cv2.INTER_AREA)
smalls = {}
for i in range(1, 8):
    h, w = valid[i].shape; x, y = pos[i]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(CW, x+w), min(CH, y+h)
    if x1 <= x0 or y1 <= y0: continue
    sx, sy = x0-x, y0-y
    dist = cv2.distanceTransform(valid[i], cv2.DIST_L2, 3)
    d = dist[sy:sy+(y1-y0), sx:sx+(x1-x0)]; sel = d > best[y0:y1, x0:x1]
    src = imgs[i][sy:sy+(y1-y0), sx:sx+(x1-x0)]
    canvas[y0:y1, x0:x1][sel] = src[sel]; best[y0:y1, x0:x1][sel] = d[sel]; owner[y0:y1, x0:x1][sel] = i
    vm = (valid[i][sy:sy+(y1-y0), sx:sx+(x1-x0)] > 0)
    cover[y0:y1, x0:x1] |= vm
    m = vm.astype(np.float32)
    num = cv2.GaussianBlur(to_small(src.astype(np.float32) * m[..., None], x0, y0, x1, y1), (0, 0), 5)
    den = cv2.GaussianBlur(to_small(m, x0, y0, x1, y1), (0, 0), 5)
    low = num / np.maximum(den, 1e-3)[..., None]
    dsm = cv2.distanceTransform((to_small(m, x0, y0, x1, y1) > .98).astype(np.uint8), cv2.DIST_L2, 3)
    wgt = np.clip(dsm / 30, 0, 1); wgt = wgt * wgt * (3 - 2 * wgt) * (den > .5)
    smalls[i] = (low, wgt)
wsum = sum(w for _, w in smalls.values()) + 1e-6
blend_small = sum(l * w[..., None] for l, w in smalls.values()) / wsum[..., None]
up = lambda a: cv2.resize(a, (CW, CH), interpolation=cv2.INTER_CUBIC)
blend = up(blend_small); out_f = np.zeros((CH, CW, 3), np.float32)
for i, (low, _) in smalls.items():
    sel = owner == i
    out_f[sel] = canvas[sel].astype(np.float32) - up(low)[sel]      # high-frequency detail of the owner
    del sel
has = (wsum > 1e-3); has_full = cv2.resize(has.astype(np.uint8), (CW, CH), interpolation=cv2.INTER_NEAREST) > 0
mixed = np.clip(out_f + blend, 0, 255)
canvas = np.where((owner >= 0)[..., None] & has_full[..., None], mixed, canvas).astype(np.uint8)
# fallback: low-res composite where no hq pixel exists
base = cv2.cvtColor(np.array(lowres_base(tree)), cv2.COLOR_RGB2BGR)
base = cv2.resize(base, (CW, CH), interpolation=cv2.INTER_CUBIC)
canvas[~cover] = base[~cover]
print("hq coverage: %.1f%% of canvas" % (100 * cover.mean()))
cv2.imwrite(str(ROOT/"source/stitched-preview.jpg"), cv2.resize(canvas, None, fx=.3, fy=.3, interpolation=cv2.INTER_AREA))

# ---- class icons: replace the "locked" padlock nodes with the real class icons ----
# source/class-icons/<skill id>.png are crops of the in-game (unlocked, unselected) nodes. The padlock frame is replaced by
# an ordinary dim frame + the icon; a lit version (frame + brightened icon) is exported for when the class is selected.
GAIN = 4.35
sk = {k["id"]: k for k in json.loads((ROOT/"public/data/tree.json").read_text())["skills"]}
def node_px(sid): return round(sk[sid]["x"]*W*R), round(sk[sid]["y"]*H*R)
HALF = 107                                   # crop radius around a start node (canvas px)
wx, wy = node_px("wizard")                   # Wizard = a lit, unlocked frame with a plain panel
tpl = canvas[wy-HALF:wy+HALF, wx-HALF:wx+HALF].astype(np.float32)
panel = np.array([117, 112, 93], np.float32)  # BGR of the lit panel colour
rim_col = tpl[107, 18].copy()
ring = np.zeros((2*HALF, 2*HALF), bool); ring[14:201, 14:201] = True; ring[27:188, 27:188] = False
ring &= np.abs(tpl - rim_col).max(axis=2) > 6; tpl[ring] = rim_col                      # staff tip overlapping the rim
_in = tpl[27:188, 27:188]; _m = np.abs(_in - panel).max(axis=2) > 6
STAFF_PEAK = float(np.percentile(_in.max(axis=2)[_m], 95))                          # brightness of an in-game lit start icon
inner = tpl[27:188, 27:188]; inner[np.abs(inner - panel).max(axis=2) > 6] = panel   # erase the staff -> empty frame
FR = slice(14, 201)                          # frame extent inside the 214px crop
frame_mask = np.zeros((2*HALF, 2*HALF), bool); frame_mask[FR, FR] = True
cls_dir = ROOT/"source/class-icons"; sprite_dir = ROOT/"public/assets/classes"; sprite_dir.mkdir(parents=True, exist_ok=True)
class_sprites = {}
for f in sorted(cls_dir.glob("*.png")):
    sid = f.stem
    if sid not in sk: continue
    crop = cv2.imread(str(f), cv2.IMREAD_COLOR).astype(np.float32); lum = crop.max(axis=2)
    rows = np.where((lum > 200).sum(axis=1) > 3)[0]                        # label text rows (bright white)
    label_top = rows[rows > crop.shape[0] * .55].min() if (rows > crop.shape[0] * .55).any() else crop.shape[0]
    icon, ilum = crop[:max(label_top - 4, 1)], lum[:max(label_top - 4, 1)]
    bg = np.median(ilum[:6]) if ilum.size else 3
    spread = icon.max(axis=2) - icon.min(axis=2)
    alpha = np.clip((ilum - 7) / 9, 0, 1) * (spread <= 14)      # class icons are neutral grey; drop teal line fragments in the crop
    ys, xs = np.where(alpha > .5); y0, y1, x0, x1 = ys.min(), ys.max()+1, xs.min(), xs.max()+1
    icon, alpha = icon[y0:y1], alpha[y0:y1]; icon, alpha = icon[:, x0:x1], alpha[:, x0:x1]
    h, w = alpha.shape; cx, cy = node_px(sid); ox, oy = HALF - w//2, HALF - h//2 - 4
    pk = float(np.percentile(icon.max(axis=2)[alpha > .5], 99)); lit_gain = 240 / max(pk, 1)   # match lit start nodes
    print("  lit gain", round(lit_gain, 2), "(icon p99 ->240)")
    def compose(base, gain, lit=False):
        out = base.copy(); sl = (slice(oy, oy+h), slice(ox, ox+w))
        pic = np.clip(255 * np.clip(icon / pk, 0, 1) ** .6 * 1.0, 0, 255) if lit else np.clip(icon * gain, 0, 255)   # lit: lift mid-tones like the in-game lit icons
        out[sl] = out[sl] * (1 - alpha[..., None]) + pic * alpha[..., None]
        return out
    dim = compose(tpl / GAIN, 1.0); lit = compose(tpl, lit_gain, True)
    region = canvas[cy-HALF:cy+HALF, cx-HALF:cx+HALF]
    region[frame_mask] = np.clip(lit, 0, 255).astype(np.uint8)[frame_mask]       # start nodes are always lit in the background, like Nomad/Ranger/Wizard
    sprite = np.dstack([np.clip(lit, 0, 255).astype(np.uint8), (frame_mask * 255).astype(np.uint8)])
    cv2.imwrite(str(sprite_dir/f"{sid}.png"), sprite)
    class_sprites[sid] = {"src": f"assets/classes/{sid}.png?v={int(__import__('time').time())}", "half": round(HALF / R, 3)}
    print("class icon:", sid, "icon", (w, h), "px")

# ---- fade the outer edge into the page background (baked into alpha) ----
lowmask = np.zeros((CH, CW), np.uint8)
for L in tree["layers"][:2]:
    r, c = L["rect"], L["clip"]
    x0, x1 = round(r["x"]*CW), round((r["x"]+r["w"])*CW); y0, y1 = round(c["y0"]*CH), min(CH, round(min(c["y1"], r["y"]+r["h"])*CH))
    lowmask[y0:y1, x0:x1] = 255
union = ((cover.astype(np.uint8)*255) | lowmask)
dist = cv2.distanceTransform(cv2.copyMakeBorder(union, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0), cv2.DIST_L2, 3)[1:-1, 1:-1]
alpha = np.clip(dist / (70 * R), 0, 1); alpha = (alpha * alpha * (3 - 2 * alpha) * 255).astype(np.uint8)
rgba = np.dstack([cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB), alpha])

# ---- tile ----
out = ROOT/"public/assets/tiles"; out.mkdir(parents=True, exist_ok=True)
for f in out.glob("*.webp"): f.unlink()
NX, NY, OV = 3, 3, 3
layers = []
for ty in range(NY):
    for tx in range(NX):
        x0, x1 = tx*CW//NX, (tx+1)*CW//NX; y0, y1 = ty*CH//NY, (ty+1)*CH//NY
        x0, y0 = max(0, x0-OV), max(0, y0-OV); x1, y1 = min(CW, x1+OV), min(CH, y1+OV)
        name = f"tiles/t{ty}{tx}.webp"
        Image.fromarray(rgba[y0:y1, x0:x1]).save(ROOT/"public/assets"/name, quality=93, alpha_quality=100, method=4)
        r = {"x": round(x0/CW, 6), "y": round(y0/CH, 6), "w": round((x1-x0)/CW, 6), "h": round((y1-y0)/CH, 6)}
        layers.append({"id": f"t{ty}{tx}", "src": "assets/"+name, "rect": r, "clip": {"y0": r["y"], "y1": round(r["y"]+r["h"], 6)}})
t = json.loads((ROOT/"public/data/tree.json").read_text())
t["layers"] = layers
for k in t["skills"]:
    if k["id"] in class_sprites: k["litSprite"] = class_sprites[k["id"]]
(ROOT/"public/data/tree.json").write_text(json.dumps(t, indent=1))
print("wrote", len(layers), "tiles;", sum(f.stat().st_size for f in out.glob("*.webp"))//1024, "KB total; canvas", CW, "x", CH)
