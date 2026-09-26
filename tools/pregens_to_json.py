#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Convertit « Jungle Tomb of the Mummy Bride PreGens (DCC).pdf » en fiches JSON dcc-sheet.

Source primaire = pages textuelles impaires (3, 5, ... 21) ; pages paires (visuelles)
utilisées uniquement pour recoupement.

Usage :
    python tools/pregens_to_json.py           # génère pregens/*.json + rapport
    python tools/pregens_to_json.py --check   # validation seule, n'écrit rien
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import pymupdf  # type: ignore
except ImportError:  # pragma: no cover
    import fitz as pymupdf  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "Jungle Tomb of the Mummy Bride PreGens (DCC).pdf"
OUT_DIR = ROOT / "pregens"
OVERRIDES_PATH = Path(__file__).with_name("pregens_overrides.json")

# --------------------------------------------------------------------------- champs
COMMON_FIELDS = """
nom titre metier alignement mouvement niveau px classe_armure points_de_vie max_pv
initiative des_action attaque des_critique table_critique force force_mod agilite
agilite_mod js_reflexe endurance endurance_mod js_vigueur presence presence_mod
js_volonte chance chance_mod jet_chanceux intelligence intelligence_mod langues
attaque_cac degats_cac att_distance degats_distance portrait_source portrait_index
armes equipement tresor armure
""".split()

CLASS_FIELDS = {
    "clerc": "dieu test_incantation risque_defaire notes".split(),
    "mage": "incantation familier patron corruption notes".split(),
    "elfe": "incantation familier patron patron_invoc_nb corruption autres_notes notes".split(),
    "guerrier": "coup_critique arme_chance hfa notes".split(),
    "nain": "arme_chance hfa notes".split(),
    "halfelin": "discretion notes".split(),
    "voleur": """
        de-chance falsifier-documents attaque-sournoise deguiser deplacement-silencieux
        lire-langues cacher-ombre utiliser-poisons vol-tire incanter-parchemin
        escalade-parois crocheter-serrures detecter-pieges desamorcer-pieges notes
    """.split(),
}

CLASS_FROM_LABEL = {
    "cleric": "clerc",
    "wizard": "mage",
    "elf": "elfe",
    "dwarf": "nain",
    "halfling": "halfelin",
    "warrior": "guerrier",
    "thief": "voleur",
}

ALIGNMENTS = {"L": "Lawful", "N": "Neutral", "C": "Chaotic"}
PORTRAIT_DEFAULT = ("dcc", "0")

# table DCC standard : sert de contrôle (le PDF peut imprimer autre chose)
DCC_MOD = {3: -3, 4: -2, 5: -2, 6: -1, 7: -1, 8: -1, 9: 0, 10: 0, 11: 0,
           12: 0, 13: 1, 14: 1, 15: 1, 16: 2, 17: 2, 18: 2, 19: 3, 20: 3,
           21: 4, 22: 4, 23: 5, 24: 5}


def dcc_mod(score: int) -> int:
    if score <= 3:
        return -3
    if score >= 25:
        return 6 + (score - 24) // 2
    return DCC_MOD[score]


def collapse(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def slugify(name: str) -> str:
    s = name.lower().replace("\u201c", "").replace("\u201d", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def capfirst(s: str) -> str:
    s = s.strip()
    return s[:1].upper() + s[1:] if s else s


# --------------------------------------------------------------------------- parsing
def split_top(s: str) -> list:
    """Découpe une liste de sorts sur ';' et ',' au niveau supérieur des parenthèses.

    Le PDF contient des parenthèses non refermées (p.ex. Shansa / MM#5) : on force
    alors une coupure sur « ), » et on rééquilibre la profondeur.
    """
    out, depth, cur = [], 0, ""
    i, n = 0, len(s)
    while i < n:
        ch = s[i]
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch in ",;":
            rest = s[i + 1:].lstrip()
            is_level = bool(re.match(r"\(\d(?:st|nd|rd|th)\)", rest, re.I))
            after_close = cur.rstrip().endswith(")")
            if depth == 0 or is_level or after_close:
                if cur.strip():
                    out.append(cur.strip())
                cur = ""
                if is_level or after_close:
                    depth = 0
                i += 1
                continue
        cur += ch
        i += 1
    if cur.strip():
        out.append(cur.strip())
    return out


def paren_block(s: str, start: int):
    """(texte_avant_parenthese, contenu_parenthese_equilibre)."""
    if start < 0 or start >= len(s) or s[start] != "(":
        return s, ""
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "(":
            depth += 1
        elif s[i] == ")":
            depth -= 1
            if depth == 0:
                return s[:start], s[start + 1:i]
    # parenthèse jamais refermée dans le PDF
    return s[:start], (s[start + 1:] if s[start] == "(" else s[start:])


def parse_ability(raw, score: int, warns: list, who: str) -> int:
    """Modificateur imprimé dans le PDF, corrigé si un '+' a été perdu."""
    table = dcc_mod(score)
    if raw is None or not str(raw).strip():
        return table
    printed = int(str(raw).strip())
    if printed == table:
        return table
    if abs(printed) == abs(table):
        return table  # signe perdu à l'extraction
    warns.append("%s: mod. %s -> %s imprimé (table DCC %s)" % (who, score, printed, table))
    return printed


def extract_sections(text: str) -> dict:
    out = {}
    m = re.search(r"\bArmor\s*:", text)
    if not m:
        return out
    out["head"] = text[:m.start()].strip()

    headers = [(mm.start(), mm.group(1), mm.end())
               for mm in re.finditer(r"\b(Armor|Equipment|Potions|Scrolls|Corruption|Attacks)\s*:", text)]
    att_start = len(text)
    for start, name, _ in headers:
        if name == "Attacks":
            att_start = start
            break

    art_start = None
    am = re.search(r"[\w'\u2019]+(?:\s+[\w'\u2019]+){0,6},\s*artifact\s*,", text[m.end():att_start])
    if am:
        art_start = m.end() + am.start()

    for i, (start, name, end) in enumerate(headers):
        stop = headers[i + 1][0] if i + 1 < len(headers) else len(text)
        if art_start is not None and name != "Attacks":
            stop = min(stop, art_start)
        out[name] = text[end:stop].strip()
    if art_start is not None:
        out["Artifact"] = text[art_start:att_start].strip()
    return out


def parse_spell_list(seg: str):
    """-> (sorts [{'level','name','test','effect','extra'}], pouvoirs [str])."""
    spells, powers, level = [], [], None
    for token in split_top(seg):
        token = token.strip().rstrip(",;.")
        if not token:
            continue
        mk = re.match(r"\((\d)(?:st|nd|rd|th)\)\s*(.*)$", token, re.I)
        if mk:
            level = int(mk.group(1))
            token = mk.group(2).strip()
        if not token:
            continue
        if level is None:
            powers.append(token)
            continue
        name, paren = paren_block(token, token.find("("))
        test = effect = extra = ""
        mm = re.search(r"MM\s*#?\s*(\d+)", paren)
        if mm:
            effect = re.split(r"[.)]", paren[mm.end():], 1)[0].strip(" -\u2013\u2014")
            head_txt = paren[:mm.start()]
        else:
            head_txt = paren
        tm = re.search(r"([+-]\d+)\s*spell check", head_txt)
        if tm:
            test = tm.group(1)
            head_txt = head_txt.replace(tm.group(0), "")
        extra = re.sub(r"\s+", " ", head_txt).strip(" ,;")
        spells.append({
            "level": level,
            "name": capfirst(re.sub(r"\s+", " ", name)),
            "test": test,
            "effect": effect,
            "extra": extra,
        })
    return spells, powers


def clean_die(s: str) -> str:
    """Supprime le dé de hauts-faits (« 1d5 result ») des valeurs de dégâts."""
    s = re.sub(r"[+-]?\s*1d5\s*result", "", s)
    s = re.sub(r"\s*1d5(?![0-9])", "", s)
    s = re.sub(r"\s*result", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return re.sub(r"\s*[+-]\s*$", "", s)


def norm_bonus(s: str) -> str:
    """Extrait le bonus plat d'une attaque, hors dé de hauts-faits."""
    s = s.strip()
    if not s:
        return "+0"
    if s[0] not in "+-":
        s = "+" + s
    parts = re.findall(r"[+-][^+-]+", s)
    kept = [p for p in parts if p[1:].strip() not in ("1d5", "d5", "")]
    if not kept:
        return "+0"
    return re.sub(r"\s+", "", "".join(kept))


def first_melee(bullets: list):
    for b in bullets:
        if "melee" in b:
            m = re.search(r"1d20([^)]*?)\s*melee\s*\(([^)]*)\)", b)
            if m:
                return norm_bonus(m.group(1)), clean_die(m.group(2)).split(",")[0].strip()
    return "", ""


def first_missile(bullets: list):
    """Attaque/dégâts à distance : préfère une arme avec un bonus plat,
    sinon la première arme à distance (bonus de dé de hauts-faits seul)."""
    fallback = None
    for b in bullets:
        if "missile" in b or "range" in b:
            m = re.search(r"1d20([^)]*?)\s*missile\s*(?:fire)?\s*\(([^)]*)\)", b)
            if m:
                dmg = clean_die(m.group(2)).split(";")[0].strip()
                dmg = re.sub(r"^[^:]*:\s*", "", dmg)
                cand = (norm_bonus(m.group(1)), dmg)
                if cand[0] != "+0":
                    return cand
                if fallback is None:
                    fallback = cand
    return fallback or ("", "")


THIEF_SKILLS = [
    ("backstab", "attaque-sournoise"),
    ("sneak silently", "deplacement-silencieux"),
    ("hide in shadows", "cacher-ombre"),
    ("pick pocket", "vol-tire"),
    ("climb sheer surfaces", "escalade-parois"),
    ("pick lock", "crocheter-serrures"),
    ("find trap", "detecter-pieges"),
    ("disable trap", "desamorcer-pieges"),
    ("forge document", "falsifier-documents"),
    ("disguise self", "deguiser"),
    ("read languages", "lire-langues"),
    ("handle poison", "utiliser-poisons"),
]

FIXED_ELF_SPELLS = ["patron bond", "invoke patron"]


# --------------------------------------------------------------------------- fiche
def build(pdf, text_page: int, warns: list) -> dict:
    text = collapse(pdf[text_page - 1].get_text())
    m = re.match(r"^(?P<name>.+?)\s*\((?P<label>[^)]+)\)\s*:\s*STR", text)
    if not m:
        raise SystemExit("page %d : en-tête introuvable" % text_page)
    name = m.group("name").strip()
    label = m.group("label").strip()
    slug = slugify(name)

    cls = None
    for key, val in CLASS_FROM_LABEL.items():
        if label.lower().startswith(key):
            cls = val
            break
    if cls is None:
        raise SystemExit("page %d : classe inconnue %r" % (text_page, label))

    sec = extract_sections(text)
    head = sec.get("head", "")

    def grab(pattern, default=""):
        mm = re.search(pattern, head)
        return mm.group(1).strip() if mm else default

    # --- stats -------------------------------------------------------------
    sm = re.search(
        r"STR\s*(\d+)\s*\(\s*([^)]*?)\s*\)\s*;\s*AGI\s*(\d+)\s*\(\s*([^)]*?)\s*\)\s*;\s*"
        r"STA\s*(\d+)\s*\(\s*([^)]*?)\s*\)\s*;\s*PER\s*(\d+)\s*\(\s*([^)]*?)\s*\)\s*;\s*"
        r"INT\s*(\d+)\s*\(\s*([^)]*?)\s*\)\s*;\s*LUCK\s*(\d+)\s*\(\s*([^)]*?)\s*\)", head)
    if not sm:
        raise SystemExit("page %d : caractéristiques introuvables" % text_page)
    keys = ["force", "agilite", "endurance", "presence", "intelligence", "chance"]
    stats = {}
    for i, key in enumerate(keys):
        score = int(sm.group(i * 2 + 1))
        stats[key] = str(score)
        stats[key + "_mod"] = str(parse_ability(sm.group(i * 2 + 2), score, warns, slug))

    birth = grab(r"Birth augur:\s*(.*?);\s*Languages:")
    langues = grab(r"Languages:\s*(.*?);\s*Init")
    init = grab(r"Init\s*([+-]\d+)", "+0")
    ac_m = re.search(r"\bAC\s*(\d+)(?:\s*\(([^)]*)\))?", head)
    ac_value = ac_m.group(1) if ac_m else ""
    ac_special = (ac_m.group(2) or "").strip() if ac_m else ""
    hp_m = re.search(r"HD\s*[\dd+]+;\s*(\d+)\s*hp", head)
    hp = hp_m.group(1) if hp_m else ""
    mv = grab(r"MV\s*(.*?);\s*Act")
    act = grab(r"Act\s*(.*?);\s*Occupation", "1d20")
    occupation = grab(r"Occupation:\s*(.*?);\s*(?:Patron:)?")
    patron = grab(r"Patron:\s*(.*?);\s*SP")
    sv = re.search(r"SV\s*Fort\s*([+-]\d+),\s*Ref\s*([+-]\d+),\s*Will\s*([+-]\d+)", head)
    align = grab(r";\s*AL\s*([LNC])\s*;")
    crit = re.search(r"Crit\s*(?:(\d+\s*-\s*\d+)\s*)?([IVX]+)\s*/\s*(d\d+)", head)
    sp_m = re.search(r"\bSP\s+(.*?);\s*SV", head)
    sp = sp_m.group(1).strip() if sp_m else ""
    spell_check = grab(r"spellcasting\s*\(([+-]\d+)\s*spell check\)")

    # --- sections ----------------------------------------------------------
    armor = collapse(sec.get("Armor", ""))
    equip = collapse(sec.get("Equipment", ""))
    potions = collapse(sec.get("Potions", ""))
    scrolls = collapse(sec.get("Scrolls", ""))
    artifact = collapse(sec.get("Artifact", ""))
    corruption = collapse(sec.get("Corruption", ""))
    attacks = sec.get("Attacks", "")
    # pied de page = nom en capitales
    up = attacks.upper()
    idx = up.rfind(name.upper())
    if idx != -1 and len(attacks) - idx < len(name) + 6:
        attacks = attacks[:idx]
    bullets = [collapse(b) for b in re.split(r"\u2022", attacks) if b.strip()]

    money = ""
    mm = re.search(r"\d+\s*cp\s*,\s*\d+\s*sp\s*,\s*\d+\s*gp(?:\s*,\s*[^)]*\(\d+\s*gp\))?"
                   r"|\d+\s*sp\s*,\s*\d+\s*gp", equip)
    if mm:
        money = mm.group(0)
        equip = equip[:mm.start()] + "money" + equip[mm.end():]
        equip = re.sub(r"\(\s*money\s*\)", "(money)", equip)
        equip = collapse(equip)

    notes = []
    if ac_special:
        notes.append("AC %s" % ac_special)

    # --- sorts -------------------------------------------------------------
    spells, powers = [], []
    sm2 = re.search(r"spell check\)\s*:\s*spells\s*(?:\(cleric\)\s*)?(.*?);\s*SV", head)
    if sm2:
        spells, powers = parse_spell_list(sm2.group(1))

    if sm2:  # lanceur de sorts : les traits sont avant "spellcasting"
        cut = sp.find("spellcasting")
        features = sp[:cut].strip(" ,;") if cut > 0 else ""
    else:
        features = sp

    # --- fiche -------------------------------------------------------------
    data = {}
    data["nom"] = name
    data["titre"] = label
    data["metier"] = capfirst(occupation)
    data["alignement"] = ALIGNMENTS.get(align, align)
    data["mouvement"] = mv.replace("\u2019", "").replace("'", "")
    data["niveau"] = "3"
    data["px"] = ""
    data["classe_armure"] = ac_value
    data["points_de_vie"] = hp
    data["max_pv"] = hp
    data["initiative"] = "1d20" + (init if init[0] in "+-" else "+" + init)
    data["des_action"] = act.split("+")[0].strip() or "1d20"
    data["des_critique"] = crit.group(3) if crit else ""
    data["table_critique"] = crit.group(2) if crit else ""
    for key in keys:
        data[key] = stats[key]
        data[key + "_mod"] = stats[key + "_mod"]
    data["js_vigueur"] = str(int(sv.group(1))) if sv else ""
    data["js_reflexe"] = str(int(sv.group(2))) if sv else ""
    data["js_volonte"] = str(int(sv.group(3))) if sv else ""
    data["jet_chanceux"] = birth
    data["langues"] = langues
    data["portrait_source"], data["portrait_index"] = PORTRAIT_DEFAULT

    atk_cac, dmg_cac = first_melee(bullets)
    atk_dis, dmg_dis = first_missile(bullets)
    data["attaque_cac"] = atk_cac
    data["degats_cac"] = dmg_cac
    data["att_distance"] = atk_dis or "0"
    data["degats_distance"] = dmg_dis or "0"
    data["armes"] = "\n".join(bullets)
    data["equipement"] = equip
    data["armure"] = armor

    lines = []
    if money:
        lines.append(money)
    if potions:
        lines.append("Potions: %s" % potions)
    if scrolls:
        lines.append("Scrolls: %s" % scrolls)
    data["tresor"] = "\n".join(lines)

    # bonus d'attaque de base (convention des exemples de l'appli)
    data["attaque"] = "+d5" if cls in ("guerrier", "nain") else ("+1" if cls == "mage" else "+2")

    spell_notes = []

    if cls == "clerc":
        dieu = label.split("of", 1)[1].strip() if " of " in label else ""
        data["dieu"] = dieu
        data["test_incantation"] = "1d20%s" % spell_check if spell_check else ""
        data["risque_defaire"] = "1"
        for i, sp_ in enumerate(spells, 1):
            data["sort_%d" % i] = sp_["name"]
            if sp_["test"] or sp_["extra"]:
                spell_notes.append("%s: %s" % (sp_["name"], " ".join(x for x in (sp_["test"], sp_["extra"]) if x)))
        if powers:
            notes.append("Powers: " + "; ".join(powers))

    elif cls == "mage":
        data["incantation"] = "1d20%s" % spell_check if spell_check else ""
        data["familier"] = ""
        data["patron"] = patron
        data["corruption"] = corruption
        for i, sp_ in enumerate(spells, 1):
            data["sort_nom_%d" % i] = sp_["name"]
            data["sort_niveau_%d" % i] = str(sp_["level"])
            data["sort_test_%d" % i] = sp_["test"]
            data["sort_effet_%d" % i] = sp_["effect"]
            if sp_["extra"]:
                spell_notes.append("%s: %s" % (sp_["name"], sp_["extra"]))

    elif cls == "elfe":
        data["incantation"] = "1d20%s" % spell_check if spell_check else ""
        data["familier"] = ""
        data["patron"] = patron
        data["corruption"] = ""
        data["autres_notes"] = ""
        fixed, free = [], []
        for sp_ in spells:
            key = sp_["name"].lower()
            if key in FIXED_ELF_SPELLS:
                fixed.append(sp_)
            else:
                free.append(sp_)
        inv = next((s for s in fixed if s["name"].lower() == "invoke patron"), None)
        nb = re.search(r"(\d+)\s*/\s*day", inv["extra"] + " " + inv["test"]) if inv else None
        data["patron_invoc_nb"] = nb.group(1) if nb else ""
        for i, sp_ in enumerate(free, 3):
            data["sort_nom_%d" % i] = sp_["name"]
            data["sort_niveau_%d" % i] = str(sp_["level"])
            data["sort_test_%d" % i] = sp_["test"]
            data["sort_effet_%d" % i] = sp_["effect"]
            if sp_["extra"]:
                spell_notes.append("%s: %s" % (sp_["name"], sp_["extra"]))
        if fixed:
            spell_notes.append("Fixed rows: " + "; ".join(
                "%s = %s%s" % (s["name"], s["effect"] or "-", (" (%s)" % s["extra"] if s["extra"] else ""))
                for s in fixed))

    elif cls in ("guerrier", "nain"):
        if cls == "guerrier":
            data["coup_critique"] = re.sub(r"\s+", "", crit.group(1)) if (crit and crit.group(1)) else ""
        wm = re.search(r"Lucky Weapon\s*\([^)]*\):\s*([^,]+)", sp)
        data["arme_chance"] = wm.group(1).strip() if wm else ""
        dm = re.search(r"deed die\s*\(\s*\+?(d\d+)\s*\)", sp)
        data["hfa"] = dm.group(1) if dm else ""
        if cls == "nain" and features:
            notes.append("Features: %s" % features)

    elif cls == "halfelin":
        dm = re.search(r"sneak silently\s*\+(\d+)", sp)
        data["discretion"] = dm.group(1) if dm else ""
        if features:
            notes.append("Features: %s" % features)

    elif cls == "voleur":
        for label_, field in THIEF_SKILLS:
            mm_ = re.search(re.escape(label_) + r"\s*\+(\d+)", sp)
            data[field] = mm_.group(1) if mm_ else ""
        mm_ = re.search(r"cast spell from scroll\s*d(\d+)\s*([+-]\d+)?", sp)
        data["incanter-parchemin"] = (mm_.group(1) + (mm_.group(2) or "")) if mm_ else ""
        mm_ = re.search(r"Luck and Wits\s*\(\s*d(\d+)", sp)
        data["de-chance"] = mm_.group(1) if mm_ else ""
        # toutes les SP du voleur sont mappées dans leurs champs dédiés

    if features and cls == "elfe":
        notes.append("Features: %s" % features)
    if spell_notes:
        notes.append("Spell notes: " + " | ".join(spell_notes))
    if artifact:
        notes.append("Artifact: %s" % artifact)
    data["notes"] = "\n".join(notes)

    return {"slug": slug, "name": name, "class": cls, "data": data, "stats": stats}


# --------------------------------------------------------------------------- sortie
def validate(entry: dict) -> list:
    cls, data = entry["class"], entry["data"]
    allowed = set(COMMON_FIELDS) | set(CLASS_FIELDS[cls])
    problems = []
    for key, val in data.items():
        if not isinstance(val, str):
            problems.append("%s : valeur non-string (%r)" % (key, val))
            continue
        if key in allowed:
            continue
        if cls == "clerc" and re.fullmatch(r"sort_\d+", key):
            continue
        if cls in ("mage", "elfe") and re.fullmatch(r"sort_(nom|niveau|test|effet)_\d+", key):
            idx = int(re.search(r"_(\d+)$", key).group(1))
            if cls == "elfe" and idx < 3:
                problems.append("%s : index < 3 non autorisé pour elfe" % key)
                continue
            continue
        problems.append("%s : champ inconnu pour %s" % (key, cls))
    missing = sorted(allowed - set(data))
    if missing:
        problems.append("champs vides/absents : " + ", ".join(missing))
    return problems


def main() -> int:
    check_only = "--check" in sys.argv
    overrides = {}
    if OVERRIDES_PATH.exists():
        overrides = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))

    pdf = pymupdf.open(PDF_PATH)
    entries = []
    warns = []
    errors = []
    for page in range(3, 22, 2):  # pages texte : 3, 5, ... 21
        try:
            entries.append(build(pdf, page, warns))
        except SystemExit as exc:
            errors.append(str(exc))

    for entry in entries:
        ov = overrides.get(entry["slug"], {})
        for old, new in ov.get("replace", {}).items():
            for k, v in list(entry["data"].items()):
                if old in v:
                    entry["data"][k] = v.replace(old, new)
        entry["data"].update(ov.get("set", {}))

    problems = []
    for entry in entries:
        for p in validate(entry):
            problems.append("%s (%s) : %s" % (entry["name"], entry["class"], p))

    print("=== %d personnages extraits de %s" % (len(entries), PDF_PATH.name))
    for entry in entries:
        d = entry["data"]
        spell_keys = [k for k in d if k.startswith("sort")]
        print("\n%-34s class=%-8s CA=%-3s PV=%-3s MV=%-10s att=%-4s cac=%-6s sorts=%d"
              % (entry["name"], entry["class"], d["classe_armure"], d["points_de_vie"],
                 d["mouvement"], d["attaque"], d["attaque_cac"], len(spell_keys) // (4 if entry["class"] in ("mage", "elfe") else 1)))
        if entry["class"] in ("mage", "elfe"):
            for i in sorted(int(k.rsplit("_", 1)[1]) for k in d if k.startswith("sort_nom_")):
                print("      %2d. %-28s niv %s  test %-4s effet: %s"
                      % (i, d.get("sort_nom_%d" % i, ""), d.get("sort_niveau_%d" % i, ""),
                         d.get("sort_test_%d" % i, ""), d.get("sort_effet_%d" % i, "")))
        elif entry["class"] == "clerc":
            for i in sorted(int(k.rsplit("_", 1)[1]) for k in d if re.fullmatch(r"sort_\d+", k)):
                print("      %2d. %s" % (i, d.get("sort_%d" % i, "")))

    if warns:
        print("\n--- ALERTES (%d)" % len(warns))
        for w in warns:
            print("  ! " + w)
    if problems:
        print("\n--- PROBLEMES DE SCHEMA (%d)" % len(problems))
        for p in problems:
            print("  ! " + p)
    if errors:
        print("\n--- ERREURS (%d)" % len(errors))
        for e in errors:
            print("  ! " + e)

    if check_only:
        return 0 if not errors else 1

    OUT_DIR.mkdir(exist_ok=True)
    for entry in entries:
        payload = {"version": 1, "class": entry["class"], "name": entry["name"],
                   "is_active": 1, "data": entry["data"]}
        path = OUT_DIR / ("%s.json" % entry["slug"])
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("\nécrit : %s" % path.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8") if hasattr(sys.stdout, "reconfigure") else None
    raise SystemExit(main())
