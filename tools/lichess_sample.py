"""Выборка шахматных задач из открытой базы Lichess (CC0) — потоком из stdin.

  curl -sL https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc | python tools/lichess_sample.py web/games/data/chess.json

Берём по PER_BUCKET задач на каждые 100 пунктов рейтинга (400–2900): только популярные,
сыгранные много раз и с устоявшимся рейтингом. Останавливаемся, когда все корзины полные.
"""

import csv
import json
import sys

PER_BUCKET = 60
LO, HI = 400, 2900
MAX_LINES = 3_000_000


def main(out_path: str) -> None:
    buckets: dict[int, list] = {b: [] for b in range(LO, HI, 100)}
    reader = csv.reader(sys.stdin)
    header = next(reader)
    idx = {name: i for i, name in enumerate(header)}
    for n, row in enumerate(reader):
        if n > MAX_LINES or all(len(v) >= PER_BUCKET for v in buckets.values()):
            break
        try:
            rating, dev = int(row[idx["Rating"]]), int(row[idx["RatingDeviation"]])
            pop, plays = int(row[idx["Popularity"]]), int(row[idx["NbPlays"]])
        except (ValueError, IndexError):
            continue
        b = rating // 100 * 100
        if b not in buckets or len(buckets[b]) >= PER_BUCKET or dev > 90 or pop < 80 or plays < 300:
            continue
        moves = row[idx["Moves"]].split()
        if not 2 <= len(moves) <= 8:
            continue
        buckets[b].append([row[idx["PuzzleId"]], row[idx["FEN"]], " ".join(moves), rating, row[idx["Themes"]]])
    puzzles = sorted((p for v in buckets.values() for p in v), key=lambda p: p[3])
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"source": "Lichess puzzle database (CC0), https://database.lichess.org/", "puzzles": puzzles}, f, separators=(",", ":"))
    print(f"{len(puzzles)} задач, корзин заполнено: {sum(len(v) >= PER_BUCKET for v in buckets.values())}/{len(buckets)}", file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1])
