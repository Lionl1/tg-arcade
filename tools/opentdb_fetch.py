"""Скачивает вопросы Open Trivia Database (CC BY-SA 4.0) с соблюдением лимита API (1 запрос / 5 с).

  python tools/opentdb_fetch.py web/games/data/trivia.json [batches]
"""

import json
import sys
import time
import urllib.parse
import urllib.request

API = "https://opentdb.com"


def get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "arcade-data-builder"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def main(out: str, batches: int = 12) -> None:
    token = get(f"{API}/api_token.php?command=request")["token"]
    qs, seen = [], set()
    for _ in range(batches):
        d = get(f"{API}/api.php?amount=50&type=multiple&encode=url3986&token={token}")
        if d.get("response_code") not in (0,):
            break
        for q in d["results"]:
            u = urllib.parse.unquote
            text = u(q["question"])
            if text in seen:
                continue
            seen.add(text)
            qs.append([u(q["category"]), u(q["difficulty"]), text, u(q["correct_answer"]), [u(a) for a in q["incorrect_answers"]]])
        time.sleep(5.5)
    json.dump({"source": "Open Trivia Database (opentdb.com), CC BY-SA 4.0", "questions": qs},
              open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(qs)} вопросов", file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 12)
