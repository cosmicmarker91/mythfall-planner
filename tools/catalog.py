"""Node catalogue transcribed from https://mythfall.wiki.gg/wiki/Skill_Tree (patch v0.21.0). Effects verbatim, ' / ' = line break."""
START = """Nomad|nomad|+2 Vitality / +2 Speed
Warrior|warrior|+4 Strength
Ranger|ranger|+4 Dexterity
Wizard|wizard|+4 Willpower
Paladin|paladin|+2 Strength / +2 Willpower
Duelist|duelist|+2 Strength / +2 Dexterity
Trickster|trickster|+2 Dexterity / +2 Willpower"""
KEY = """Barbarian Defense|barb-def|+0 Strength (75% of Base Defense) / +0 Defense (40% of Base Defense)
Iron Fortress|iron-fortress|+0 Thorns (50% of Total Defense) / -10 Speed
Blood Pact|blood-pact|2x Lifesteal Power / Gain No Health Regeneration
Assassinate|assassinate|Gain Assassinate: Upon backstabbing, make the enemy Fragile (once every 3 seconds) / +15 Damage Received
Endless Dance|endless-dance|Gain Endless Dance: Upon killing an enemy, regain a dash / -50 Dash CDR
Spellweaver|spellweaver|Gain Spellweaver: Hits cut your ability cooldown by 2% / 0.5x Mana Regeneration
Deadeye|deadeye|Gain Deadeye: Upon a critical hit, make the enemy Fractured (once every 2 seconds) / -10 Bonus Attack Speed
Volatile|volatile|Gain Volatile: Upon a critical hit, set off an explosion on the enemy (once per second) / -10 Damage %
Epidemic|epidemic|Gain Epidemic: Upon killing an enemy with Poison, Bleed or Burn, it bursts and poisons the enemies around it / -6 Vitality
Phantom|phantom|Gain Phantom: Upon dodging, become Intangible for 1 second (once every 5 seconds) / +0 Defense (50% of Base Defense)
Single Combat|single-combat|With Nearby Enemies at most 1 / +20 Damage % / With Nearby Enemies above 1 / -10 Damage %
Undying|undying|Gain Undying: Upon a hit leaving you below 30% health, gain Invulnerable status effect for 2 seconds (once every 20 seconds) / With Health above 50% / -15 Damage %
Shatterpoint|shatterpoint|Gain Shatterpoint: Upon taking damage, clear the enemy shots near you (once every 4 seconds) / 0x Dodge
Blood Magic|blood-magic|Gain Blood Magic: Abilities cost health instead of mana / +0 Vitality (25% of Base Energy)
Necromancy|necromancy|Gain Necromancy: Upon killing an enemy, 2 spirits rise from it and hunt nearby enemies / -10 Bonus Attack Speed
Momentum|momentum|+4 Damage % (per Second Moving, up to +20) / -5 Damage % (per Second Standing Still, up to -20)
Bullet Storm|bullet-storm|+1 Projectiles / -35 Damage %
Minefield|minefield|Gain Minefield: Upon dashing, drop a mine that explodes when an enemy touches it / -30 Dash Distance
Earthshaker|earthshaker|Gain Earthshaker: Upon hitting an enemy, send a shockwave out around you (once every 2 seconds) / -10 Bonus Attack Speed"""
TRAVEL = """Strength|strength|+2 Strength|7
Dexterity|dexterity|+2 Dexterity|12
Willpower|willpower|+2 Willpower|10
Defense|defense|+1 Defense|9
Vitality|vitality|+1 Vitality|5
Energy|speed|+1 Energy|5
Critical|critical|+2 Critical Chance|5
Lifesteal|lifesteal|+1 Lifesteal Chance|3
Manasteal|manasteal|+1 Manasteal Chance|2
Dodge|dodge|+2 Dodge|4
Dash CDR|dashcooldown|+5 Dash CDR|1
Health Regeneration|health-regeneration|+1 Health Regeneration|1
Mana Regeneration|mana-regeneration|+1 Mana Regeneration|2
Attack Speed|attack-speed|+2 Bonus Attack Speed|1
Thorns|thorns|+5 Thorns|1
Luck|luck|+3 Luck|1
Stealth|stealth|+10 Stealth|3"""
NOTABLE = """Virulence|virulence|+5 Poison Chance / +5 Bleed Chance
Opportunist|opportunist|Gain Opportunist: Upon backstabbing, gain Vicious status effect for 3 seconds
Evasive Maneuvers|evasive-maneuvers|+1 Dodge (per Nearby Enemy, up to +6)
Festering|festering|Gain Festering: Upon hitting an enemy with Poison, Bleed or Burn, make it Weakened (once every 3 seconds)
Powder Keg|powder-keg|Gain Powder Keg: Upon killing an enemy, cut your dash recharge by 25%
Second Wind|second-wind|Gain Second Wind: Upon a hit leaving you below 50% health, gain Healing status effect for 3 seconds (once every 10 seconds)
Measured Strikes|measured-strikes|Gain Measured Strikes: Upon a critical hit, gain Enraged status effect for 3 seconds
Composure|composure|With full Health / +5 Critical Chance
Iron Grip|iron-grip|With Melee Weapons: / +5 Bonus Attack Speed
Master of Arms|arms-master|+2 Strength / +2 Dexterity
Vicious|vicious|+5 Critical Chance
Flowing Strikes|flowing-strikes|Gain Flowing Strikes: Hits while you have Rapid Fire cut your dash recharge by 10% (once every 0.5 seconds)
Riposte|riposte|Gain Riposte: Upon dodging, cut your dash recharge by 50%
Vigor|vigor|+1 Health Regeneration
Vanish|vanish|Gain Vanish: Upon killing an enemy, gain Shadowstep status effect for 3 seconds
Master of Defense|def-master|+1 Vitality / +1 Defense / +1 Speed
Fleetfoot|fleetfoot|+10 Dash CDR
Hearty|hearty|+2 Vitality
Basic Evasion|evasion|+5 Dodge
Clarity|clarity|+1 Mana Regeneration
Lucky Looter|lucky-looter|+10 Luck
Desperation|desperation|+1 Strength (per 10% Health Missing, up to +5)
Slipstream|slipstream|Gain Slipstream: Upon dodging, gain Haste status effect for 2 seconds
Inner Focus|inner-focus|With Magic Weapons: / +5 Bonus Attack Speed
Bloodlust|bloodlust|Gain Bloodlust: Upon killing an enemy, gain 3 health
Chain Reaction|chain-reaction|Gain Chain Reaction: Upon killing an enemy, set off a small explosion where it died
Soul Siphon|soul-siphon|Gain Soul Siphon: Upon killing an enemy, gain 4 mana
Surgical Strikes|surgical-strikes|With Melee Weapons: / +5 Critical Chance
Arcane Flow|arcane-flow|Gain Arcane Flow: Critical hits cut your ability cooldown by 5%
Executioner|executioner|Gain Executioner: Upon hitting an enemy below 30% health, gain Vicious status effect for 2 seconds
Rending Fury|rending-fury|Gain Rending Fury: Hits while you are Enraged make the enemy Bleed (once per second)
Headhunter|headhunter|Gain Headhunter: Upon killing an enemy, gain Reflexive status effect for 4 seconds
Magic Proficiency|magic-prof|With Magic Weapons: / +10 Bonus Projectile Chance
Veiled|veiled|+20 Stealth
Soloist|soloist|With Nearby Allies equaling 0 / +10 Damage %
Longstride|longstride|+20 Dash Distance
Last Stand|last-stand|With Health below 50% / +4 Health Regeneration
Defensive Conversion|def-conversion|+0 Vitality (50% of Base Defense)
Rally|rally|+1 Strength (per Nearby Ally, up to +5)
Surrounded|surrounded|+1 Defense (per Nearby Enemy, up to +5)
Perfected Strikes|perfect-strikes|With full Health / +8 Strength / Without full Health / +4 Strength
Phantom Arc|phantom-arc|With Throwable: / Gain Backstab
Shadow Strength|shadow-strength|+0 Strength (7% of Total Dexterity)
Shadow Dexterity|shadow-dexterity|+0 Dexterity (7% of Total Strength)
Afterimage|afterimage|-1 Size Bonus
Phantom Step|phantom-step|+1 Dashes
Body Slam|body-slam|+0 Strength (20% of Total Defense)
Battle Frenzy|battle-frenzy|Gain Battle Frenzy: Upon taking damage, gain Enraged status effect for 5 seconds
Arcane Will|arcane-will|With Staff: / +0 Damage (25% of Base Willpower)
Mystic Echo|mystic-echo|Gain Mystic Echo: Upon casting an ability, gain Focused status effect for 5 seconds
Arcane Ripple|arcane-ripple|Gain Arcane Ripple: Upon casting an ability, summon an arcane missile (once per second)
Arcane Friction|arcane-friction|Gain Arcane Friction: Upon dashing, gain 1 mana
Magic Armor|magic-armor|+0 Defense (12% of Total Willpower)
Vampiric Tendencies|vamp-tend|+3 Lifesteal Power / +3 Manasteal Power / -2 Vitality
Magic Adrenaline|magic-adrenaline|With Health below 50% / +6 Willpower
Wraith Form|wraith-form|+25 Wraith Form: Gives a percent chance to become Intangible when taking damage / -6 Vitality
Dancing Tempo|dancing-tempo|Gain Dancing Tempo: Upon dashing, gain Rapid Fire status effect for 2 seconds
Dexterous Footwork|dex-footwork|+0 Speed (25% of Total Dexterity)
Sidestep|sidestep|+0 Dodge (50% of Total Speed)
Forceful Archery|forceful-archery|With Ranged Weapons: / +0 Damage (8% of Total Strength)
Sniper's Focus|sniper-focus|+5 Critical Chance (per Second Standing Still, up to +15)
Reinforced String|reinforced-string|With Ranged Weapons: / -2 Bonus Attack Speed / +2 Damage
Piercing Volley|piercing-volley|With Ranged Weapons: / +10 Pierce Chance
Explosive Dash|explosive-dash|Gain Explosive Dash: Upon dashing, leave behind an explosion
Explosives Expert|explosives-expert|+20 Explosion Size Bonus
Impact Rounds|impact-rounds|With Cannon: / +3 Bind Chance
Swift Step|swift-step|+1 Dashes
Thick Skin|thick-skin|+2 Defense
Bramble Shield|bramble-shield|+7 Thorns
Hold the Line|hold-the-line|+1 Defense (per Second Standing Still, up to +5)
Vital Leech|vital-leech|+4 Lifesteal Chance
Thirst|thirst|+1 Lifesteal Power (per 10% Health Missing, up to +5)
Deflection|deflection|Gain Deflection: Upon dashing past an enemy shot, summon an arcane missile
Shockwave|shockwave|Gain Shockwave: Upon a hit leaving you below 40% health, clear the enemy shots around you (once every 30 seconds)
Sanguine Surge|sanguine-surge|+1 Willpower (per 10% Health Missing, up to +5)
Transfusion|transfusion|Gain Transfusion: Upon casting an ability, gain Healing status effect for 3 seconds (once every 6 seconds)
Grave Chill|grave-chill|Gain Grave Chill: Upon killing an enemy, a chill bursts from it that slows the enemies around it
Bone Armor|bone-armor|Gain Bone Armor: Upon killing an enemy, gain Armored status effect for 4 seconds
Tailwind|tailwind|+1 Dexterity (per Second Moving, up to +5)
Blade Wake|blade-wake|Gain Blade Wake: Upon dashing, send a slash along your dash that cuts through every enemy in its path
Hail of Lead|hail-of-lead|+25 Bonus Projectile Chance
Overflow|overflow|+5 Overflow: Gives a percent chance to summon an arcane missile on hit
Spite|spite|Gain Spite: Upon taking damage, drop a mine at your feet (once every 3 seconds)
Caltrops|caltrops|Gain Caltrops: Upon dashing, scatter caltrops around you that hurt every enemy that steps on them
Stalwart|stalwart|+0 Bonus Invulnerability (20% of Total Strength)
Deep Reserves|deep-reserves|+0 Energy (20% of Total Willpower)
Quick Hands|quick-hands|+0 Bonus Attack Speed (5% of Total Dexterity)
Pinpoint Accuracy|pinpoint-accuracy|With Ranged Weapons: / +5 Critical Chance
Aftershock|aftershock|Gain Aftershock: Upon killing an enemy, send a small shockwave out around you
Tremor|tremor|Gain Tremor: Upon hitting an enemy, make it Slow for 1 second (once every 2 seconds)"""
def rows(s, n): return [l.split("|") for l in s.splitlines()]
def catalog():
    out = []
    for name, slug, eff in rows(START, 3): out.append(dict(name=name, kind="start", icon=slug, effect=eff.split(" / ")))
    for name, slug, eff in rows(KEY, 3): out.append(dict(name=name, kind="keystone", icon=slug, effect=eff.split(" / ")))
    for name, slug, eff in rows(NOTABLE, 3): out.append(dict(name=name, kind="notable", icon=slug, effect=eff.split(" / ")))
    for name, slug, eff, cnt in rows(TRAVEL, 4): out.append(dict(name=name, kind="travel", icon=slug, effect=eff.split(" / "), count=int(cnt)))
    return out
if __name__ == "__main__":
    c = catalog(); from collections import Counter; print(len(c), Counter(x["kind"] for x in c))
