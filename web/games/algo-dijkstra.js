// Алгоритм Дейкстры на взвешенном графе
Arcade.register(Algo.viz({
  about: L('Кратчайшие пути от одной вершины, когда у рёбер есть веса (длины дорог). Каждый раз берём непосещённую вершину с наименьшим известным расстоянием и «ослабляем» рёбра из неё. Веса не должны быть отрицательными.', 'Shortest paths from one vertex when edges have weights (road lengths). Each time take the unvisited vertex with the smallest known distance and “relax” its edges. Weights must not be negative.'),
  complexity: L('O((V + E) log V) с двоичной кучей', 'O((V + E) log V) with a binary heap'),
  code: L(['dist[start] = 0, остальные = ∞', 'пока есть непосещённые:', '  v = непосещённая с минимальным dist', '  для каждого ребра v → u с весом w:', '    если dist[v] + w < dist[u]: dist[u] = dist[v] + w'], ['dist[start] = 0, the rest = ∞', 'while there are unvisited vertices:', '  v = unvisited vertex with the smallest dist', '  for each edge v → u with weight w:', '    if dist[v] + w < dist[u]: dist[u] = dist[v] + w']),
  make(api) {
    const pos = [[0.1, 0.5], [0.33, 0.2], [0.33, 0.8], [0.6, 0.2], [0.6, 0.8], [0.88, 0.5]];
    const pairs = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [3, 5], [4, 5], [1, 4]];
    return { pos, edges: pairs.map(([x, y]) => [x, y, 1 + api.randi(9)]) };
  },
  run({ pos, edges }) {
    const n = pos.length, dist = new Array(n).fill(Infinity), seen = new Set(), F = [];
    const p = (l, t, cur, edge) => F.push({ s: { pos, edges, dist: dist.slice(), seen: new Set(seen), cur, edge }, l, t });
    dist[0] = 0; p(0, L('Старт — вершина A, расстояние 0', 'Start at vertex A, distance 0'));
    while (seen.size < n) {
      let v = -1;
      for (let k = 0; k < n; k++) if (!seen.has(k) && (v < 0 || dist[k] < dist[v])) v = k;
      if (dist[v] === Infinity) break;
      seen.add(v); p(2, L(`Берём ${'ABCDEF'[v]} (расстояние ${dist[v]})`, `Take ${'ABCDEF'[v]} (distance ${dist[v]})`), v);
      for (const [x, y, w] of edges) {
        if (x !== v && y !== v) continue;
        const u = x === v ? y : x;
        if (seen.has(u)) continue;
        if (dist[v] + w < dist[u]) { dist[u] = dist[v] + w; p(4, L(`Через ${'ABCDEF'[v]} до ${'ABCDEF'[u]}: ${dist[v]} + ${w} = ${dist[u]} — лучше`, `Via ${'ABCDEF'[v]} to ${'ABCDEF'[u]}: ${dist[v]} + ${w} = ${dist[u]} — better`), v, [x, y]); }
        else p(3, L(`${'ABCDEF'[v]}→${'ABCDEF'[u]}: ${dist[v]} + ${w} ≥ ${dist[u]} — не лучше`, `${'ABCDEF'[v]}→${'ABCDEF'[u]}: ${dist[v]} + ${w} ≥ ${dist[u]} — not better`), v, [x, y]);
      }
    }
    p(1, L('Готово: найдены кратчайшие расстояния от A до всех вершин', 'Done: shortest distances from A to every vertex found'), -1);
    return F;
  },
  draw(ctx, W, H, f, C) {
    const { pos, edges, dist, seen, cur, edge } = f.s;
    const P = pos.map(([x, y]) => [x * W, y * H]), R = Math.min(22, W / 16);
    ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [x, y, w] of edges) {
      const on = edge && ((edge[0] === x && edge[1] === y) || (edge[0] === y && edge[1] === x));
      ctx.strokeStyle = on ? C.warn : C.hint; ctx.lineWidth = on ? 4 : 2;
      ctx.beginPath(); ctx.moveTo(...P[x]); ctx.lineTo(...P[y]); ctx.stroke();
      ctx.fillStyle = C.bg; const mx = (P[x][0] + P[y][0]) / 2, my = (P[x][1] + P[y][1]) / 2;
      ctx.beginPath(); ctx.arc(mx, my, 10, 0, 7); ctx.fill(); ctx.fillStyle = C.fg; ctx.fillText(w, mx, my);
    }
    P.forEach(([x, y], k) => {
      ctx.fillStyle = k === cur ? C.warn : seen.has(k) ? C.good : C.accent;
      ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 14px system-ui'; ctx.fillText('ABCDEF'[k], x, y - 4);
      ctx.font = '600 11px system-ui'; ctx.fillText(dist[k] === Infinity ? '∞' : dist[k], x, y + 9);
    });
    ctx.textBaseline = 'alphabetic';
  },
}));
