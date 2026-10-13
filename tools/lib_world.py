import json, pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
def lowres_base(tree):
    """World-sized composite of the original low-res screenshots (used for registration + as fallback)."""
    W, H = tree["world"]["width"], tree["world"]["height"]
    base = Image.new("RGB", (W, H), (10, 10, 10))
    for name, L in zip(("lowres-top", "lowres-bottom"), tree["layers"][:2]):
        im = Image.open(ROOT/"source"/f"{name}.png").convert("RGB"); r = L["rect"]; c = L["clip"]
        im = im.resize((round(r["w"]*W), round(r["h"]*H)), Image.LANCZOS)
        x, y = round(r["x"]*W), round(r["y"]*H); y0, y1 = round(c["y0"]*H), round(c["y1"]*H)
        base.paste(im.crop((0, max(0, y0-y), im.width, y1-y)), (x, max(y0, y)))
    return base
