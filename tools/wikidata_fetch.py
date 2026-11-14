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
    # самые известные картины мира (для английского интерфейса): художники из списка, по числу статей Википедии
    "paintings_world": """
SELECT ?p ?pl ?al ?y ?dy ?sl WHERE {
  VALUES ?an { "Leonardo da Vinci"@en "Michelangelo"@en "Raphael"@en "Sandro Botticelli"@en "Titian"@en "Caravaggio"@en "Rembrandt"@en "Johannes Vermeer"@en "Diego Velázquez"@en "Francisco Goya"@en "El Greco"@en "Peter Paul Rubens"@en "Pieter Bruegel the Elder"@en "Hieronymus Bosch"@en "Jan van Eyck"@en "Albrecht Dürer"@en "J. M. W. Turner"@en "John Constable"@en "Eugène Delacroix"@en "Gustave Courbet"@en "Édouard Manet"@en "Claude Monet"@en "Pierre-Auguste Renoir"@en "Edgar Degas"@en "Paul Cézanne"@en "Vincent van Gogh"@en "Paul Gauguin"@en "Georges Seurat"@en "Henri de Toulouse-Lautrec"@en "Edvard Munch"@en "Gustav Klimt"@en "Pablo Picasso"@en "Henri Matisse"@en "Salvador Dalí"@en "René Magritte"@en "Wassily Kandinsky"@en "Kazimir Malevich"@en "Piet Mondrian"@en "Frida Kahlo"@en "Edward Hopper"@en "Grant Wood"@en "Jackson Pollock"@en "Andy Warhol"@en "Katsushika Hokusai"@en "Caspar David Friedrich"@en "Jean-François Millet"@en "James McNeill Whistler"@en "John Singer Sargent"@en "Ilya Repin"@en "Ivan Aivazovsky"@en "Jacques-Louis David"@en "Jean-Auguste-Dominique Ingres"@en "Théodore Géricault"@en "Joan Miró"@en "Marc Chagall"@en "Amedeo Modigliani"@en "Hans Holbein the Younger"@en "Giotto"@en "Thomas Gainsborough"@en "William Blake"@en }
  ?a rdfs:label ?an.
  ?p wdt:P170 ?a; wdt:P31 wd:Q3305213; wikibase:sitelinks ?sl.
  FILTER(?sl >= 6)
  ?p rdfs:label ?pl FILTER(lang(?pl) = "en").
  BIND(STR(?an) AS ?al)
  OPTIONAL { ?p wdt:P571 ?d. BIND(YEAR(?d) AS ?y) }
  OPTIONAL { ?a wdt:P570 ?dd. BIND(YEAR(?dd) AS ?dy) }
} ORDER BY DESC(?sl) LIMIT 4000""",
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
