#!/usr/bin/env python3
"""Generates public/data/tree.json from tools/skills.src.txt.

Run once to bootstrap; after that public/data/tree.json is the hand-editable
source of truth (nudge x/y of any skill, or swap the whole file for official data).

World coordinate system: pixels of the TOP screenshot, origin top-left.
Everything is written out normalized (0-1) over WORLD_W x WORLD_H.
"""
import json, re, collections, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
WORLD_W, WORLD_H = 2030, 2066
# grid of the top screenshot (px)
GX0, GY0, STEP = 252, 99, 111
# bottom screenshot: scale relative to top, and where its pixels land in the world
K = 111 / 113.1
B_LEFT, B_TOP = 252 - 193.1 * K, 987 - 53 * K
SEAM = 1048  # world y where the top image stops and the bottom image takes over

STATS = {"Speed","Dexterity","Defense","Strength","Vitality","Willpower"}
STARTS = {"Warrior","Duelist","Paladin","Ranger","Wizard","Trickster","Nomad"}
slug = lambda s: re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")

rows = []
for line in (ROOT/"tools/skills.src.txt").read_text().splitlines():
    if not line.strip() or line.startswith("#"): continue
    c, r, name = line.split(" ", 2)
    rows.append((int(c), int(r), name.strip()))
count = collections.Counter(n for _,_,n in rows)

skills = []
for c, r, name in rows:
    sid = slug(name) if count[name] == 1 else f"{slug(name)}-c{c}r{r}".replace("-c-","-cm")
    if name in STARTS:   shape, half = "square", 44
    elif name in STATS:  shape, half = "diamond", 23
    else:                shape, half = "square", 34
    skills.append({
        "id": sid, "name": name, "shape": shape,
        "x": round((GX0 + c*STEP)/WORLD_W, 5),
        "y": round((GY0 + r*STEP)/WORLD_H, 5),
        "size": round(2*half/WORLD_W, 5),
        **({"start": True} if name in STARTS else {}),
    })
assert len({s["id"] for s in skills}) == len(skills), "duplicate ids"

n = lambda v, d: round(v/d, 5)
tree = {
  "version": 1,
  "note": "Temporary screenshot-based data. x/y are the CENTER of each skill, normalized 0-1 over the world. size = icon width, normalized by world width. Replace with official data later.",
  "world": {"width": WORLD_W, "height": WORLD_H},
  "layers": [
    {"id": "top",    "src": "assets/tree-top.png",
     "rect": {"x": 0, "y": 0, "w": n(2000,WORLD_W), "h": n(1052,WORLD_H)},
     "clip": {"y0": 0, "y1": n(SEAM,WORLD_H)}},
    {"id": "bottom", "src": "assets/tree-bottom.png",
     "rect": {"x": n(B_LEFT,WORLD_W), "y": n(B_TOP,WORLD_H), "w": n(2000*K,WORLD_W), "h": n(1151*K,WORLD_H)},
     "clip": {"y0": n(SEAM,WORLD_H), "y1": 1}},
  ],
  "skills": skills,
}
out = ROOT/"public/data/tree.json"
if out.exists():   # keep the stitched background layers and detected edges; only skills are regenerated
    old = json.loads(out.read_text()); tree["layers"] = old["layers"]; tree["edges"] = old.get("edges", [])
out.write_text(json.dumps(tree, indent=1))
print(len(skills), "skills")
