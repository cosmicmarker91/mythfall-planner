#!/usr/bin/env python3
"""Quick update after a game patch:
  1. Open  https://mythfall.wiki.gg/index.php?title=Module:Data/items.json&action=raw  in your browser
  2. Save it as  source/items.raw.json   (a .rtf from TextEdit is fine too: it is converted automatically)
  3. python3 tools/build-items.py
Writes public/data/items.json (equippable items only) and downloads any missing icons into public/assets/items/."""
import json, pathlib, subprocess, sys, urllib.request, concurrent.futures as cf
ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "source/items.raw.json"
RTF = ROOT / "source/items.raw.json.rtf"
if RTF.exists() and (not RAW.exists() or RTF.stat().st_mtime > RAW.stat().st_mtime):
    subprocess.run(["textutil", "-convert", "txt", "-output", str(RAW), str(RTF)], check=True)   # macOS: TextEdit saved it as rich text
data = json.loads(RAW.read_text())
SLOTS = {"Pet", "Helmet", "Cape", "Weapon", "Armor", "Ability", "Boots", "Ring"}
items, rarities = [], {}
for x in data:
    rarities.setdefault(x.get("Rarity"), x.get("RarityColor"))
    if x.get("EquipType") not in SLOTS or x.get("Deprecated") or not x.get("Name") or x["Name"] == "???": continue
    items.append({"id": x["ID"], "name": x["Name"], "desc": x.get("Description", ""), "type": x["EquipType"], "cls": x.get("Class", ""),
                  "sub": x.get("Subtitle", ""), "tier": x.get("Tier", "T0"), "rarity": x.get("Rarity", "Common"),
                  "found": (x.get("Found") or "").split(",")[0].strip(), "tip": x.get("Tip", {})})
items.sort(key=lambda i: (i["type"], int(i["tier"][1:] or 0), i["name"]))
(ROOT / "public/data").mkdir(parents=True, exist_ok=True)
(ROOT / "public/data/items.json").write_text(json.dumps({"rarities": rarities, "items": items}, separators=(",", ":"), ensure_ascii=False))
print(len(items), "items written")

icons = ROOT / "public/assets/items"; icons.mkdir(parents=True, exist_ok=True)
def grab(i):
    p = icons / f"{i}.png"
    if p.exists() and p.stat().st_size > 50: return None
    for _ in range(3):
        try:
            req = urllib.request.Request(f"https://mythfall.wiki.gg/images/Item-{i}.png", headers={"User-Agent": "Mozilla/5.0 (Macintosh)"})
            p.write_bytes(urllib.request.urlopen(req, timeout=25).read()); return None
        except Exception as e: err = e
    return f"{i}: {err}"
with cf.ThreadPoolExecutor(6) as ex: bad = [b for b in ex.map(grab, [i["id"] for i in items]) if b]
print("icons ok" if not bad else f"icons failed: {bad}")
