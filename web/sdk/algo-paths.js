// Поиск пути: BFS, DFS и A* на одной сетке (общий код для трёх визуализаций)
window.AlgoPaths = (kind) => Algo.viz({
  about: {
    bfs: 'Обход в ширину: расходимся «волной» от старта — сначала все клетки на расстоянии 1, потом 2… Первый найденный путь — самый короткий.',
    dfs: 'Обход в глубину: идём, пока можем, и возвращаемся назад в тупиках. Находит какой-то путь, но не обязательно короткий.',
    astar: 'A*: как BFS, но в первую очередь раскрываем клетки, которые ближе к цели по оценке «пройдено + осталось (манхэттен)». Обычно проверяет гораздо меньше клеток.',
  }[kind],
  complexity: kind === 'astar' ? 'O(E log V) с очередью с приоритетом; на практике — сильно меньше клеток, чем BFS' : 'O(V + E) — каждая клетка и переход не больше одного раза',
  code: {
    bfs: ['queue = [start]; seen = {start}', 'while queue:', '  cur = queue.pop_front()', '  if cur == goal: восстановить путь', '  for next in соседи(cur):', '    if next не стена и не в seen:', '      seen.add(next); prev[next] = cur; queue.push_back(next)'],
    dfs: ['stack = [start]; seen = {}', 'while stack:', '  cur = stack.pop()', '  if cur == goal: восстановить путь', '  seen.add(cur)', '  for next in соседи(cur):', '    if next не стена и не в seen: prev[next] = cur; stack.push(next)'],
    astar: ['open = {start: h(start)}; g[start] = 0', 'while open:', '  cur = узел с минимальным g + h', '  if cur == goal: восстановить путь', '  for next in соседи(cur):', '    if g[cur] + 1 < g[next]:', '      g[next] = g[cur] + 1; prev[next] = cur; open.add(next)'],
  }[kind],
  make(api) {
    const cols = 14, rows = 10, cells = new Uint8Array(cols * rows);
    for (let k = 0; k < cells.length; k++) if (api.rand() < 0.28) cells[k] = 1;
    const start = (rows >> 1) * cols + 1, goal = (rows >> 1) * cols + cols - 2;
    cells[start] = cells[goal] = 0;
    return { cols, rows, cells, start, goal };
  },
  run({ cols, rows, cells: base, start, goal }) {
    const cells = Uint8Array.from(base), F = [], prev = new Map();
    const p = (l, t) => F.push({ s: { cols, rows, cells: Uint8Array.from(cells), start, goal }, l, t });
    const nb = (c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [c % cols + dx, Math.floor(c / cols) + dy])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows).map(([x, y]) => y * cols + x).filter((k) => base[k] !== 1);
    const h = (c) => Math.abs(c % cols - goal % cols) + Math.abs(Math.floor(c / cols) - Math.floor(goal / cols));
    const path = () => { let c = goal, n = 0; while (c !== start) { cells[c] = 4; c = prev.get(c); n++; } p(3, `Путь найден: ${n} шагов, проверено клеток: ${F.length}`); };
    let open = [start];
    const g = new Map([[start, 0]]), seen = new Set([start]);
    p(0, 'Старт');
    while (open.length) {
      let cur;
      if (kind === 'bfs') cur = open.shift();
      else if (kind === 'dfs') { cur = open.pop(); if (cells[cur] === 3) continue; }
      else { open.sort((a, b) => g.get(a) + h(a) - (g.get(b) + h(b))); cur = open.shift(); }
      cells[cur] = 3;
      if (cur === goal) { path(); return F; }
      for (const nx of nb(cur)) {
        if (kind === 'astar') {
          const ng = g.get(cur) + 1;
          if (ng < (g.has(nx) ? g.get(nx) : Infinity)) { g.set(nx, ng); prev.set(nx, cur); if (!open.includes(nx)) open.push(nx); if (cells[nx] === 0) cells[nx] = 2; }
        } else if (kind === 'bfs' ? !seen.has(nx) : cells[nx] !== 3) {
          seen.add(nx); prev.set(nx, cur); open.push(nx); if (cells[nx] === 0) cells[nx] = 2;
        }
      }
      p(kind === 'astar' ? 2 : 2, kind === 'bfs' ? `Очередь: ${open.length} клеток` : kind === 'dfs' ? `Стек: ${open.length} клеток` : `Открытых: ${open.length}, лучшая оценка g+h`);
    }
    p(1, 'Пути нет — стены перекрыли дорогу. Нажми 🔀');
    return F;
  },
  draw: Algo.grid,
});
