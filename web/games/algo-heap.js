// Двоичная куча (max-heap): вставка с «всплытием» и извлечение максимума с «просеиванием»
Arcade.register(Algo.viz({
  about: L('Куча — дерево, где родитель не меньше детей, поэтому максимум всегда в корне. Хранится прямо в массиве: дети узла i — это 2i+1 и 2i+2. Основа очереди с приоритетом и пирамидальной сортировки.', 'A heap is a tree where a parent is never smaller than its children, so the maximum is always at the root. It lives right in an array: the children of node i are 2i+1 and 2i+2. The basis of priority queues and heapsort.'),
  complexity: L('вставка и извлечение максимума — O(log n), посмотреть максимум — O(1)', 'insert and extract-max — O(log n), peek at the max — O(1)'),
  code: L(['push(x): a.append(x); i = последний', '  while i > 0 and a[parent(i)] < a[i]: swap, i = parent(i)', 'pop(): max = a[0]; a[0] = a.pop()', '  while ребёнок больше: swap с бо́льшим ребёнком', '  return max'], ['push(x): a.append(x); i = last', '  while i > 0 and a[parent(i)] < a[i]: swap, i = parent(i)', 'pop(): max = a[0]; a[0] = a.pop()', '  while a child is larger: swap with the larger child', '  return max']),
  make(api) { return [...Array(9)].map(() => api.randi(90) + 10); },
  run(vals) {
    const a = [], F = [];
    const p = (l, t, hi = {}) => {
      const nodes = a.map((key, i) => ({ key, left: 2 * i + 1 < a.length ? 2 * i + 1 : null, right: 2 * i + 2 < a.length ? 2 * i + 2 : null }));
      F.push({ s: { nodes, root: a.length ? 0 : null, hi, arr: a.slice() }, l, t });
    };
    for (const x of vals) {
      a.push(x); let i = a.length - 1;
      p(0, L(`Добавляем ${x} в конец`, `Append ${x} at the end`), { [i]: '#a371f7' });
      while (i > 0 && a[(i - 1) >> 1] < a[i]) {
        const par = (i - 1) >> 1;
        [a[par], a[i]] = [a[i], a[par]];
        p(1, L(`${a[par]} больше родителя — всплывает`, `${a[par]} is larger than its parent — sifts up`), { [par]: 'bad', [i]: 'bad' });
        i = par;
      }
    }
    for (let k = 0; k < 3; k++) {
      const max = a[0], last = a.pop();
      if (a.length) a[0] = last;
      p(2, L(`Забираем максимум ${max}, на его место — последний (${last})`, `Take the max ${max}; the last element (${last}) takes its place`), { 0: 'warn' });
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l] > a[m]) m = l;
        if (r < a.length && a[r] > a[m]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        p(3, L(`Просеиваем вниз: меняем с бо́льшим ребёнком ${a[i]}`, `Sift down: swap with the larger child ${a[i]}`), { [i]: 'bad', [m]: 'bad' });
        i = m;
      }
      p(4, L(`Куча снова в порядке, новый максимум: ${a[0]}`, `The heap is in order again, new max: ${a[0]}`), { 0: 'good' });
    }
    return F;
  },
  draw(ctx, W, H, f, C) {
    Algo.tree(ctx, W, H, f, C, 8, H - 60);
    const arr = f.s.arr, c = Math.min(34, (W - 16) / Math.max(1, arr.length)), ox = (W - c * arr.length) / 2;
    ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    arr.forEach((v, i) => {
      ctx.fillStyle = f.s.hi[i] ? C[f.s.hi[i]] || f.s.hi[i] : 'rgba(127,127,127,.25)';
      ctx.fillRect(ox + i * c + 1, H - 34, c - 2, 24);
      ctx.fillStyle = C.fg; ctx.fillText(v, ox + i * c + c / 2, H - 22);
    });
    ctx.textBaseline = 'alphabetic';
  },
}));
