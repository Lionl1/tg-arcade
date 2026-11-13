# Источники данных и кода

| Что | Где используется | Источник | Лицензия |
|---|---|---|---|
| 1500 шахматных задач (выборка) | `web/games/data/chess.json` → «Шахматные задачи» | [Lichess puzzle database](https://database.lichess.org/) | CC0 (общественное достояние) |
| Правила шахмат | `web/vendor/chess.js` | [chess.js 0.10.3](https://github.com/jhlywa/chess.js), Jeff Hlywa | BSD-2-Clause |
| 800 пар фраз en↔ru | `web/games/data/phrases.json` → «Английские фразы» | [Tatoeba](https://tatoeba.org) через [ManyThings.org](https://www.manythings.org/anki/); номера предложений — в 3-м поле | CC BY 2.0 FR |
| 600 вопросов викторины | `web/games/data/trivia.json` → «Trivia (English)» | [Open Trivia Database](https://opentdb.com) | CC BY-SA 4.0 (производные наборы — под той же лицензией) |
| Площади и границы стран | `web/games/data/geo.json` → «Соседи стран», «Кто больше?» | [mledoze/countries](https://github.com/mledoze/countries) | ODbL 1.0 |
| Картинки флагов | карточки с флагами (CDN jsDelivr) | [Twemoji (jdecked)](https://github.com/jdecked/twemoji) | графика CC BY 4.0 |
| Слова с ударениями | «Ударения (задание 4)» | ориентир — «Орфоэпический список» [ФИПИ](https://fipi.ru) (навигатор ЕГЭ) | факты языка |

Скрипты сборки: `tools/lichess_sample.py`, `tools/build_data.py`, `tools/opentdb_fetch.py`. Исходные архивы — в `data/raw` (не в git).
