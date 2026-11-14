"""Собирает игровые данные из скачанных открытых источников (data/raw → web/games/data).

  python tools/build_data.py

- Tatoeba / ManyThings rus-eng (CC BY 2.0 FR) → web/games/data/phrases.json
- mledoze/countries (ODbL 1.0) → web/games/data/geo.json (площадь и соседи для наших 194 стран)
- Wikidata (CC0 1.0), скачать: python tools/wikidata_fetch.py → web/games/data/ege-art.json, ege-arch.json
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


# Художники и архитекторы, которых спрашивают в ЕГЭ по истории (культура): фамилия → как показывать
ARTISTS = {
    "Айвазовский": ("И. К. Айвазовский", "Иван"), "Брюллов": ("К. П. Брюллов", "Карл"), "Васнецов": ("В. М. Васнецов", "Виктор"), "Верещагин": ("В. В. Верещагин", "Василий"),
    "Венецианов": ("А. Г. Венецианов", "Алексей"), "Врубель": ("М. А. Врубель", "Михаил"), "Ге": ("Н. Н. Ге", "Николай"), "Дейнека": ("А. А. Дейнека", "Александр"),
    "Иванов": ("А. А. Иванов", "Александр"), "Кандинский": ("В. В. Кандинский", "Василий"), "Кипренский": ("О. А. Кипренский", "Орест"), "Крамской": ("И. Н. Крамской", "Иван"),
    "Куинджи": ("А. И. Куинджи", "Архип"), "Кустодиев": ("Б. М. Кустодиев", "Борис"), "Левитан": ("И. И. Левитан", "Исаак"), "Левицкий": ("Д. Г. Левицкий", "Дмитрий"),
    "Боровиковский": ("В. Л. Боровиковский", "Владимир"), "Малевич": ("К. С. Малевич", "Казимир"), "Нестеров": ("М. В. Нестеров", "Михаил"), "Перов": ("В. Г. Перов", "Василий"),
    "Петров-Водкин": ("К. С. Петров-Водкин", "Кузьма|Козьма"), "Поленов": ("В. Д. Поленов", "Василий"), "Репин": ("И. Е. Репин", "Илья"), "Решетников": ("Ф. П. Решетников", "Фёдор"),
    "Саврасов": ("А. К. Саврасов", "Алексей"), "Серов": ("В. А. Серов", "Валентин"), "Суриков": ("В. И. Суриков", "Василий"), "Тропинин": ("В. А. Тропинин", "Василий"),
    "Федотов": ("П. А. Федотов", "Павел"), "Шишкин": ("И. И. Шишкин", "Иван"), "Флавицкий": ("К. Д. Флавицкий", "Константин"), "Пукирев": ("В. В. Пукирев", "Василий"),
    "Шагал": ("М. З. Шагал", "Марк"), "Серебрякова": ("З. Е. Серебрякова", "Зинаида"), "Ярошенко": ("Н. А. Ярошенко", "Николай"), "Савицкий": ("К. А. Савицкий", "Константин"),
    "Рерих": ("Н. К. Рерих", "Николай"), "Пластов": ("А. А. Пластов", "Аркадий"), "Мясоедов": ("Г. Г. Мясоедов", "Григорий"), "Грабарь": ("И. Э. Грабарь", "Игорь"), "Рылов": ("А. А. Рылов", "Аркадий"),
}
ARCHITECTS = {
    "Фиораванти": ("Аристотель Фиораванти", "Аристотель"), "Яковлев": ("Постник Яковлев", "Постник"), "Растрелли": ("Ф. Б. Растрелли", "Франческо|Бартоломео"), "Бове": ("О. И. Бове", "Осип"),
    "Щусев": ("А. В. Щусев", "Алексей"), "Тон": ("К. А. Тон", "Константин"), "Монферран": ("О. Монферран", "Огюст"), "Трезини": ("Д. Трезини", "Доменико"), "Росси": ("К. И. Росси", "Карл"),
    "Воронихин": ("А. Н. Воронихин", "Андрей"), "Казаков": ("М. Ф. Казаков", "Матвей"), "Баженов": ("В. И. Баженов", "Василий"), "Кваренги": ("Дж. Кваренги", "Джакомо"),
    "Захаров": ("А. Д. Захаров", "Андреян|Адриан"), "Старов": ("И. Е. Старов", "Иван"), "Ринальди": ("А. Ринальди", "Антонио"), "Стасов": ("В. П. Стасов", "Василий"), "Шухов": ("В. Г. Шухов", "Владимир"),
    "Иофан": ("Б. М. Иофан", "Борис"), "Камерон": ("Ч. Камерон", "Чарльз"), "Шехтель": ("Ф. О. Шехтель", "Фёдор|Франц"), "Леблон": ("Ж.-Б. Леблон", "Жан-Батист"), "Чевакинский": ("С. И. Чевакинский", "Савва"),
    "Жилярди": ("Д. И. Жилярди", "Доменико"), "Фельтен": ("Ю. М. Фельтен", "Юрий|Георг"), "Мельников": ("К. С. Мельников", "Константин"), "Шервуд": ("В. О. Шервуд", "Владимир"),
    "Штакеншнейдер": ("А. И. Штакеншнейдер", "Андрей"), "Валлен-Деламот": ("Ж.-Б. Валлен-Деламот", "Жан-Батист"), "Бренна": ("В. Бренна", "Винченцо"), "Земцов": ("М. Г. Земцов", "Михаил"),
}
# памятники (у них скульпторы), рядовые дома и станции метро — не для ЕГЭ
SKIP_BUILDING = re.compile(r"Памятник|[Уу]лица|Доходный|Особняк|Магазин|Гараж|Клуб|Дача|^Дом |^дом |Здание бывшей|университет|филармония|кукол|мэрии|Ангел|^[А-ЯЁ][а-яё]+(ская|ский)?$")
# одноимённых построек много — без города вопрос неоднозначен
AMBIGUOUS = {"Вознесенский собор", "Андреевский собор", "Благовещенская церковь", "Президентский дворец", "Екатерининский зал",
             "Святодуховский собор", "Церковь Марии Магдалины", "Церковь Святой Екатерины", "Собор Рождества Пресвятой Богородицы",
             "Собор Петра и Павла", "Николаевский дворец", "Итальянский грот", "Берёзовые ворота", "Китайский театр", "Театр Парадиз"}
SKIP_TITLE = re.compile(r"^(Композиция|Импровизация|Автопортрет|Портрет|Этюд|Пейзаж|Без названия|Натюрморт)\b|\d{3,}")


def _person(label: str, table: dict) -> str | None:
    """Метка Wikidata («Илья Ефимович Репин», «Френц, Рудольф Рудольфович») → имя из таблицы, если это тот самый человек.
    Сверяем фамилию, имя и (если есть) первую букву отчества — иначе Валентин и Владимир Серовы склеятся."""
    if "," in label:
        sur, rest = label.split(",")[0].strip(), label.split(",", 1)[1].split()
    else:
        parts = label.split()
        sur, rest = parts[-1], parts[:-1]
    if sur not in table or not rest:
        return None
    show, first = table[sur]
    if rest[0] not in first.split("|"):
        return None
    ini = show.split()[:-1]
    if len(rest) > 1 and len(ini) == 2 and not rest[1].startswith(ini[1].rstrip(".")):
        return None
    return show


def _clean(title: str) -> str:
    return re.sub(r"\s*\([^)]*\)\s*$", "", title).strip()  # «Озеро (картина Левитана)» → «Озеро»


def _rows(name: str) -> list[dict]:
    return [{k: v["value"] for k, v in b.items()} for b in json.loads((RAW / "wikidata" / f"{name}.json").read_text("utf-8"))["results"]["bindings"]]


def ege_art() -> None:
    by_title: dict[str, set[str]] = {}
    info: dict[str, tuple[int, str]] = {}
    for r in _rows("paintings"):
        who = _person(r["al"], ARTISTS)
        t = _clean(r["pl"])
        if not who or SKIP_TITLE.search(t) or len(t) > 60 or not re.search("[а-яё]", t, re.I):
            continue
        if r.get("y") and r.get("dy") and int(r["y"]) > int(r["dy"]):
            continue  # ошибка в данных: картина «написана» после смерти автора
        by_title.setdefault(t, set()).add(who)
        sl = int(r["sl"])
        if t not in info or sl > info[t][0]:
            info[t] = (sl, r.get("y", ""))
    per: dict[str, int] = {}
    cards = []
    for t in sorted(info, key=lambda t: -info[t][0]):
        if len(by_title[t]) != 1:  # одно название у разных художников — неоднозначно
            continue
        who = next(iter(by_title[t]))
        if per.get(who, 0) >= 8:  # не больше 8 картин на художника, иначе колода — сплошной Кандинский
            continue
        per[who] = per.get(who, 0) + 1
        sl, y = info[t]
        cards.append([t, who, y, 1 if sl >= 12 else 2 if sl >= 6 else 3])
    data = {"source": "Wikidata (CC0 1.0), https://www.wikidata.org — запрос в tools/wikidata_fetch.py", "cards": cards}
    (OUT / "ege-art.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), "utf-8")
    print(f"ege-art: {len(cards)} картин, {len(per)} художников", file=sys.stderr)


def ege_arch() -> None:
    archs: dict[str, set[str]] = {}
    sls: dict[str, int] = {}
    for r in _rows("arch"):
        b = _clean(r["bl"])
        archs.setdefault(b, set()).add(_person(r["al"], ARCHITECTS))
        sls[b] = max(sls.get(b, 0), int(r["sl"]))
    cards = []
    for b in sorted(archs, key=lambda b: -sls[b]):
        a = archs[b]
        if len(a) != 1 or None in a or b in AMBIGUOUS or SKIP_BUILDING.search(b) or not re.search("[а-яё]", b, re.I):
            continue  # только постройки с одним известным архитектором — ответ однозначен
        sl = sls[b]
        cards.append([b, next(iter(a)), 1 if sl >= 25 else 2 if sl >= 10 else 3])
    data = {"source": "Wikidata (CC0 1.0), https://www.wikidata.org — запрос в tools/wikidata_fetch.py", "cards": cards}
    (OUT / "ege-arch.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), "utf-8")
    print(f"ege-arch: {len(cards)} построек", file=sys.stderr)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    phrases()
    geo()
    if (RAW / "wikidata").exists():
        ege_art()
        ege_arch()
