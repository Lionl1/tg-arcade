"""Собирает игровые данные из скачанных открытых источников (data/raw → web/games/data).

  python tools/build_data.py

- Tatoeba / ManyThings rus-eng (CC BY 2.0 FR) → web/games/data/phrases.json
- mledoze/countries (ODbL 1.0) → web/games/data/geo.json (площадь и соседи для наших 194 стран)
"""

import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW, OUT = ROOT / "data" / "raw", ROOT / "web" / "games" / "data"


def phrases() -> None:
    by_en: dict[str, tuple[str, str]] = {}
    with open(RAW / "rus-eng" / "rus.txt", encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            en, ru, attr = parts[0].strip(), parts[1].strip(), parts[2]
            w = len(en.split())
            # короткие понятные фразы: 3–7 слов, без имён собственных Тома и Мэри, которых в Tatoeba тысячи
            if not 3 <= w <= 7 or len(ru.split()) > 9 or re.search(r"\b(Tom|Mary|John)\b", en) or en in by_en:
                continue
            m = re.findall(r"#(\d+)", attr)
            by_en[en] = (ru, "/".join(m))
    rnd = random.Random(42)
    keys = sorted(by_en)
    rnd.shuffle(keys)
    picked, seen_ru = [], set()
    for e in keys:  # одна английская фраза на один русский перевод — иначе обратный перевод неоднозначен
        ru = by_en[e][0].lower().rstrip(".!?")
        if ru in seen_ru:
            continue
        seen_ru.add(ru)
        picked.append(e)
        if len(picked) == 800:
            break
    picked = sorted(picked, key=lambda e: (len(e.split()), e))
    data = {
        "source": "Tatoeba (tatoeba.org) via ManyThings.org, CC BY 2.0 FR; номера предложений — в поле id",
        "phrases": [[en, by_en[en][0], by_en[en][1]] for en in picked],
    }
    (OUT / "phrases.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), "utf-8")
    print(f"phrases: {len(picked)} из {len(by_en)} подходящих", file=sys.stderr)


def geo() -> None:
    raw = json.loads((RAW / "countries.json").read_text("utf-8"))
    cca3_to_2 = {c["cca3"]: c["cca2"] for c in raw}
    out = {}
    for c in raw:
        out[c["cca2"]] = {"area": round(c.get("area") or 0), "borders": [cca3_to_2[b] for b in c.get("borders", []) if b in cca3_to_2]}
    data = {"source": "mledoze/countries (ODbL 1.0), https://github.com/mledoze/countries", "countries": out}
    (OUT / "geo.json").write_text(json.dumps(data, separators=(",", ":")), "utf-8")
    print(f"geo: {len(out)} стран", file=sys.stderr)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    phrases()
    geo()
