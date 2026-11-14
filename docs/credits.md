# Источники данных и кода

| Что | Где используется | Источник | Лицензия |
|---|---|---|---|
| 1500 шахматных задач (выборка) | `web/games/data/chess.json` → «Шахматные задачи» | [Lichess puzzle database](https://database.lichess.org/) | CC0 (общественное достояние) |
| Шахматные фигуры (SVG) | `web/vendor/pieces/` → «Шахматные задачи» | набор Cburnett, Colin M.L. Burnett ([Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces)), файлы — из [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece/cburnett) | GPLv2+ / BSD / GFDL (на выбор; используем BSD) |
| Правила шахмат | `web/vendor/chess.js` | [chess.js 0.10.3](https://github.com/jhlywa/chess.js), Jeff Hlywa | BSD-2-Clause |
| 800 пар фраз en↔ru | `web/games/data/phrases.json` → «Английские фразы» | [Tatoeba](https://tatoeba.org) через [ManyThings.org](https://www.manythings.org/anki/); номера предложений — в 3-м поле | CC BY 2.0 FR |
| 600 вопросов викторины | `web/games/data/trivia.json` → «Trivia (English)» | [Open Trivia Database](https://opentdb.com) | CC BY-SA 4.0 (производные наборы — под той же лицензией) |
| Площади и границы стран | `web/games/data/geo.json` → «Соседи стран», «Кто больше?» | [mledoze/countries](https://github.com/mledoze/countries) | ODbL 1.0 |
| Картинки флагов | карточки с флагами (CDN jsDelivr) | [Twemoji (jdecked)](https://github.com/jdecked/twemoji) | графика CC BY 4.0 |
| ~190 картин и ~80 построек с авторами | `web/games/data/ege-art.json`, `ege-arch.json` → «Картины и художники», «Архитектура» | [Wikidata](https://www.wikidata.org) (SPARQL-запросы — в `tools/wikidata_fetch.py`) | CC0 1.0 |
| ~320 картин мира с авторами (английский интерфейс) | `web/games/data/en-art.json` → «Famous Paintings» | [Wikidata](https://www.wikidata.org) | CC0 1.0 |
| Английские названия стран и столиц | `web/sdk/countries.js` (английский интерфейс) | [mledoze/countries](https://github.com/mledoze/countries) | ODbL 1.0 |
| Паронимы (пары слов) | «Паронимы (задание 5)» | ориентир — словник паронимов из материалов [ФИПИ](https://fipi.ru); предложения составлены нами | факты языка |
| Слова с ударениями | «Ударения (задание 4)» | ориентир — «Орфоэпический список» [ФИПИ](https://fipi.ru) (навигатор ЕГЭ) | факты языка |

Скрипты сборки: `tools/lichess_sample.py`, `tools/wikidata_fetch.py`, `tools/build_data.py`, `tools/opentdb_fetch.py`. Исходные архивы — в `data/raw` (не в git).

Англоязычные колоды (похожие слова, орфография, грамматика, лексика, литература, история, обществознание) составлены нами; факты общеизвестны.
