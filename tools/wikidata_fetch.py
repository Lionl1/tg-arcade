"""Скачивает данные для ЕГЭ-карточек из Wikidata (CC0) в data/raw/wikidata. Потом: python tools/build_data.py

  python tools/wikidata_fetch.py

Запросы — SPARQL к query.wikidata.org; данные Wikidata распространяются под CC0 1.0.
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

RAW = Path(__file__).resolve().parent.parent / "data" / "raw" / "wikidata"
UA = "arcade-data-builder/1.0 (educational mini-games; https://github.com/Lionl1/tg-arcade)"

QUERIES = {
    # картины художников Российской империи / СССР / России; популярность — число статей Википедии (sitelinks)
    "paintings": """
SELECT ?p ?pl ?al ?y ?dy ?sl WHERE {
  ?p wdt:P31 wd:Q3305213; wdt:P170 ?a; wikibase:sitelinks ?sl.
  ?a wdt:P27 ?c. VALUES ?c { wd:Q34266 wd:Q15180 wd:Q159 }
  ?p rdfs:label ?pl FILTER(lang(?pl) = "ru").
  ?a rdfs:label ?al FILTER(lang(?al) = "ru").
  OPTIONAL { ?p wdt:P571 ?d. BIND(YEAR(?d) AS ?y) }
  OPTIONAL { ?a wdt:P570 ?dd. BIND(YEAR(?dd) AS ?dy) }
  FILTER(?sl >= 2)
} ORDER BY DESC(?sl) LIMIT 3000""",
    # здания в России с указанным архитектором
    "arch": """
SELECT ?b ?bl ?al ?sl WHERE {
  ?b wdt:P84 ?a; wdt:P17 wd:Q159; wikibase:sitelinks ?sl.
  ?b rdfs:label ?bl FILTER(lang(?bl) = "ru").
  ?a rdfs:label ?al FILTER(lang(?al) = "ru").
  FILTER(?sl >= 3)
} ORDER BY DESC(?sl) LIMIT 4000""",
}


def fetch(name: str, query: str) -> None:
    url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": query})
    req = urllib.request.Request(url, headers={"Accept": "application/sparql-results+json", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.load(r)
    (RAW / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False), "utf-8")
    print(f"{name}: {len(data['results']['bindings'])} строк", file=sys.stderr)


if __name__ == "__main__":
    RAW.mkdir(parents=True, exist_ok=True)
    for n, q in QUERIES.items():
        fetch(n, q)
        time.sleep(2)  # вежливо к публичному эндпоинту
