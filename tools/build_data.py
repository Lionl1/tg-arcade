"""Собирает игровые данные из скачанных открытых источников (data/raw → web/games/data).

  python tools/build_data.py

- Tatoeba / ManyThings rus-eng (CC BY 2.0 FR) → web/games/data/phrases.json
- mledoze/countries (ODbL 1.0) → web/games/data/geo.json (площадь и соседи для наших 194 стран)
- Wikidata (CC0 1.0), скачать: python tools/wikidata_fetch.py → web/games/data/ege-art.json, ege-arch.json
- free-exercise-db (Unlicense, общественное достояние), github.com/yuhonas/free-exercise-db → web/games/data/fit.json
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


SKIP_EN = re.compile(r"^(Self-portrait|Self-Portrait|Portrait|Untitled|Still life|Still Life|Study|Composition|Landscape|Sketch)\b|\d{3,}|\(")


# игра для школьников: без откровенных сюжетов
ADULT_EN = re.compile(r"Origine|Masturbat|\bNu\b|Nude|desnuda|Sleepers|Woman in the Waves|Odalisque|Bather|Turkish Bath|Olympia|Venus of Urbino|Sleeping Venus|Rokeby Venus|Anadyom|Venus and Cupid|Danaë|Puberty|Manaò", re.I)


def en_art() -> None:
    """Известные картины мира с английскими названиями — колода для английского интерфейса."""
    by_title: dict[str, set[str]] = {}
    info: dict[str, tuple[int, str]] = {}
    for r in _rows("paintings_world"):
        t, who = r["pl"].strip(), r["al"]
        if SKIP_EN.search(t) or ADULT_EN.search(t) or len(t) > 60 or t.lower() == t or who.split()[-1] in t or t in {"The Fif"}:
            continue
        if r.get("y") and r.get("dy") and int(r["y"]) > int(r["dy"]):
            continue
        by_title.setdefault(t, set()).add(who)
        sl = int(r["sl"])
        if t not in info or sl > info[t][0]:
            info[t] = (sl, r.get("y", ""))
    per: dict[str, int] = {}
    cards = []
    for t in sorted(info, key=lambda t: -info[t][0]):
        if len(by_title[t]) != 1:
            continue
        who = next(iter(by_title[t]))
        if per.get(who, 0) >= 6:
            continue
        per[who] = per.get(who, 0) + 1
        sl, y = info[t]
        cards.append([t, who, y, 1 if sl >= 40 else 2 if sl >= 15 else 3])
    data = {"source": "Wikidata (CC0 1.0), https://www.wikidata.org — query in tools/wikidata_fetch.py", "cards": cards}
    (OUT / "en-art.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), "utf-8")
    print(f"en-art: {len(cards)} paintings, {len(per)} artists", file=sys.stderr)


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


# Упражнения для раздела «Тело»: id из free-exercise-db → (русское название, подсказка по технике; английские)
FIT = {
    # турник
    "Pullups": ("Подтягивания", "Хват чуть шире плеч, подбородок выше перекладины, вниз — до прямых рук", "Pull-ups", "Grip a bit wider than shoulders, chin over the bar, lower to straight arms"),
    "Chin-Up": ("Подтягивания обратным хватом", "Ладони к себе, локти вдоль тела", "Chin-ups", "Palms facing you, elbows close to the body"),
    "Scapular_Pull-Up": ("Лопаточные подтягивания", "В висе на прямых руках своди и опускай лопатки", "Scapular pull-ups", "Hanging with straight arms, pull the shoulder blades down and together"),
    "Inverted_Row": ("Австралийские подтягивания", "Низкая перекладина, тело прямое, тянись грудью к перекладине", "Inverted rows", "Low bar, body straight, pull your chest to the bar"),
    "Band_Assisted_Pull-Up": ("Подтягивания с резинкой", "Резинка под колено или стопу помогает в нижней точке", "Band-assisted pull-ups", "A band under the knee or foot helps at the bottom"),
    "Hanging_Leg_Raise": ("Подъём ног в висе", "Без раскачки, ноги до горизонтали или выше", "Hanging leg raises", "No swinging, legs to horizontal or higher"),
    "One_Handed_Hang": ("Вис на турнике", "Расслабь плечи, дыши ровно; можно на двух руках", "Dead hang", "Relax the shoulders, breathe evenly; two hands are fine"),
    "Muscle_Up": ("Выход силой", "Мощное подтягивание к поясу и перевод корпуса над перекладиной", "Muscle-up", "Explosive pull to the waist, then move the torso over the bar"),
    # брусья
    "Parallel_Bar_Dip": ("Отжимания на брусьях", "Опускайся до угла 90° в локтях, корпус чуть вперёд", "Parallel bar dips", "Lower to 90° at the elbows, lean slightly forward"),
    "Dips_-_Chest_Version": ("Брусья на грудь", "Сильнее наклонись вперёд, локти в стороны", "Chest dips", "Lean further forward, elbows out"),
    "Bench_Dips": ("Обратные отжимания от скамьи", "Руки за спиной на опоре, локти назад", "Bench dips", "Hands behind you on a bench, elbows back"),
    # отжимания
    "Pushups": ("Отжимания", "Тело — прямая линия, грудь почти касается пола", "Push-ups", "Body in a straight line, chest almost to the floor"),
    "Incline_Push-Up": ("Отжимания от опоры", "Руки на скамье или стене — легче, чем от пола", "Incline push-ups", "Hands on a bench or wall — easier than from the floor"),
    "Push-Up_Wide": ("Широкие отжимания", "Руки шире плеч — больше нагрузки на грудь", "Wide push-ups", "Hands wider than shoulders — more chest"),
    "Push-Ups_-_Close_Triceps_Position": ("Узкие отжимания", "Руки под грудью, локти вдоль тела — трицепс", "Close-grip push-ups", "Hands under the chest, elbows in — triceps"),
    "Push-Ups_With_Feet_Elevated": ("Отжимания с ногами на опоре", "Ноги выше рук — нагрузка на верх груди и плечи", "Feet-elevated push-ups", "Feet above the hands — upper chest and shoulders"),
    "Plyo_Push-up": ("Взрывные отжимания", "Оттолкнись так, чтобы ладони оторвались от пола", "Plyo push-ups", "Push hard so your hands leave the floor"),
    "Single-Arm_Push-Up": ("Отжимания на одной руке", "Ноги широко, корпус не скручивай", "One-arm push-ups", "Feet wide, don’t twist the torso"),
    # ноги
    "Bodyweight_Squat": ("Приседания", "Пятки на полу, колени по направлению носков, спина ровная", "Squats", "Heels down, knees over toes, back straight"),
    "Freehand_Jump_Squat": ("Приседания с выпрыгиванием", "Мягко приземляйся на носки и сразу в присед", "Jump squats", "Land softly on your toes and go straight into a squat"),
    "Bodyweight_Walking_Lunge": ("Выпады", "Колено задней ноги почти касается пола", "Lunges", "The back knee almost touches the floor"),
    "Butt_Lift_Bridge": ("Ягодичный мост", "Лёжа на спине, поднимай таз, сжимай ягодицы", "Glute bridge", "Lying on your back, lift the hips and squeeze the glutes"),
    "Step-up_with_Knee_Raise": ("Зашагивания на опору", "Устойчивая опора, колено вверх в верхней точке", "Step-ups", "A stable step, knee up at the top"),
    # кор
    "Plank": ("Планка", "Тело прямое, живот подтянут, не провисай", "Plank", "Body straight, belly tight, don’t sag"),
    "Side_Bridge": ("Боковая планка", "Опора на локоть, таз не опускай", "Side plank", "On your elbow, keep the hips up"),
    "Crunches": ("Скручивания", "Поднимай лопатки, поясница прижата", "Crunches", "Lift the shoulder blades, lower back pressed down"),
    "Reverse_Crunch": ("Обратные скручивания", "Подтягивай колени к груди, отрывая таз", "Reverse crunches", "Pull the knees to the chest, lifting the hips"),
    "Flutter_Kicks": ("Ножницы", "Лёжа на спине, попеременно поднимай прямые ноги", "Flutter kicks", "On your back, alternate straight-leg kicks"),
    "Superman": ("Супермен", "Лёжа на животе, поднимай руки и ноги", "Superman", "Lying face down, lift arms and legs"),
    "Mountain_Climbers": ("Скалолаз", "Из упора лёжа быстро подтягивай колени к груди", "Mountain climbers", "From a plank, drive the knees to the chest fast"),
    # кардио
    "Star_Jump": ("Прыжки «звезда»", "Прыжок с разведением рук и ног", "Star jumps", "Jump spreading arms and legs"),
    "Knee_Tuck_Jump": ("Прыжки с подтягиванием коленей", "Колени к груди в прыжке, мягкое приземление", "Tuck jumps", "Knees to the chest in the air, land softly"),
    "Rope_Jumping": ("Скакалка", "Прыгай на носках, кисти крутят скакалку", "Jump rope", "Bounce on your toes, turn the rope with your wrists"),
    # растяжка и разминка
    "Hamstring_Stretch": ("Растяжка задней поверхности бедра", "Тянись к носку прямой ноги, не округляй спину", "Hamstring stretch", "Reach for the toes of the straight leg, back flat"),
    "Cat_Stretch": ("Кошка", "На четвереньках выгибай и округляй спину", "Cat stretch", "On all fours, arch and round your back"),
    "Quad_Stretch": ("Растяжка передней поверхности бедра", "Стоя, подтяни пятку к ягодице", "Quad stretch", "Standing, pull your heel to your glutes"),
    "Shoulder_Stretch": ("Растяжка плеч", "Прижми прямую руку к груди другой рукой", "Shoulder stretch", "Press a straight arm across the chest"),
    "Chest_And_Front_Of_Shoulder_Stretch": ("Раскрытие груди", "Сцепи руки за спиной и раскрой грудь", "Chest opener", "Clasp your hands behind you and open the chest"),
    "Side_Neck_Stretch": ("Растяжка шеи", "Мягко наклони голову к плечу, без рывков", "Neck stretch", "Gently tilt your head to the shoulder, no jerking"),
    "Kneeling_Forearm_Stretch": ("Растяжка предплечий", "Ладони на полу пальцами к себе, плавно отклоняйся", "Forearm stretch", "Palms on the floor, fingers towards you, lean back gently"),
    "Spinal_Stretch": ("Скрутка позвоночника", "Сидя, поверни корпус и задержись", "Spinal twist", "Sitting, rotate your torso and hold"),
    "Standing_Lateral_Stretch": ("Наклоны в стороны", "Руку вверх и тянись в сторону", "Side bends", "Arm up and reach to the side"),
}


def fit() -> None:
    raw = {x["id"]: x for x in json.loads((RAW / "free-exercise-db" / "exercises.json").read_text("utf-8"))}
    out = {}
    for eid, (ru, cue_ru, en, cue_en) in FIT.items():
        x = raw[eid]
        out[eid] = {"ru": ru, "en": en, "cue_ru": cue_ru, "cue_en": cue_en, "img": x["images"][:2],
                    "muscles": x["primaryMuscles"], "level": x["level"], "how_en": x["instructions"][:4]}
    data = {"source": "free-exercise-db by yuhonas (Unlicense, public domain), https://github.com/yuhonas/free-exercise-db", "exercises": out}
    (OUT / "fit.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), "utf-8")
    print(f"fit: {len(out)} упражнений", file=sys.stderr)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    phrases()
    geo()
    if (RAW / "wikidata").exists():
        ege_art()
        ege_arch()
        en_art()
    if (RAW / "free-exercise-db").exists():
        fit()
