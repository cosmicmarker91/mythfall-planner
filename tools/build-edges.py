#!/usr/bin/env python3
"""Detects which neighbouring skills are joined by a visible line in the screenshots
and writes them to tree.json as "edges": [[idA, idB], ...].
Nothing is invented: a pair is only linked if the line pixels are actually there.
Re-run after editing skill positions; or hand-edit "edges" in tree.json."""
import json, pathlib, numpy as np
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
tree = json.loads((ROOT/"public/data/tree.json").read_text())
W, H = tree["world"]["width"], tree["world"]["height"]
imgs = {L["id"]: (np.array(Image.open(ROOT/"public"/L["src"]).convert("RGB")).astype(int), L) for L in tree["layers"]}

def pixel(wx, wy):
    for img, L in imgs.values():
        c, r = L["clip"], L["rect"]
        if c["y0"]*H <= wy < c["y1"]*H:
            x = (wx - r["x"]*W) / (r["w"]*W) * img.shape[1]
            y = (wy - r["y"]*H) / (r["h"]*H) * img.shape[0]
            if 0 <= int(x) < img.shape[1] and 0 <= int(y) < img.shape[0]: return img[int(y), int(x)]
    return np.zeros(3, int)
def lineish(p): return p[2] - p[0] >= 8 and p[2] > 36

by_cell = {}
for s in tree["skills"]:
    by_cell[(round((s["x"]*W-252)/111), round((s["y"]*H-99)/111))] = s
edges, widths = [], []
for (c, r), a in by_cell.items():
    for dc, dr in ((1, 0), (0, 1)):
        b = by_cell.get((c+dc, r+dr))
        if not b: continue
        ax, ay, bx, by = a["x"]*W, a["y"]*H, b["x"]*W, b["y"]*H
        hits = tot = 0
        for t in np.linspace(.3, .7, 25):
            x, y = ax+(bx-ax)*t, ay+(by-ay)*t
            ok = any(lineish(pixel(x + (o if dr == 0 else 0)*0 + (o if dc == 0 else 0), y + (o if dr == 0 else 0))) for o in range(-3, 4))
            hits += ok; tot += 1
        if hits/tot >= .6:
            edges.append([a["id"], b["id"]])
            # line thickness at 20% along the segment
            x, y = ax+(bx-ax)*.5, ay+(by-ay)*.5
            widths.append(sum(lineish(pixel(x+(o if dc == 0 else 0), y+(o if dr == 0 else 0))) for o in np.arange(-8, 8, .5))*.5)
tree["edges"] = edges
(ROOT/"public/data/tree.json").write_text(json.dumps(tree, indent=1))
linked = {i for e in edges for i in e}
print(len(edges), "edges; median line width %.1f world px" % np.median(widths))
print("skills with no edge:", [s["name"] for s in tree["skills"] if s["id"] not in linked])
