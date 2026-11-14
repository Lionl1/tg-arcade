// Быстрая сортировка (схема Ломуто)
Arcade.register(Algo.viz({
  about: L('Выбираем опорный элемент (последний), раскладываем: меньшие — влево, большие — вправо. Опорный встаёт на своё место, повторяем для двух частей.', 'Pick a pivot (the last element) and partition: smaller ones go left, larger ones right. The pivot lands in its final place; repeat for both parts.'),
  complexity: L('O(n log n) в среднем, O(n²) в худшем (неудачные опорные); O(log n) памяти на рекурсию', 'O(n log n) on average, O(n²) worst case (bad pivots); O(log n) memory for recursion'),
  code: ['quick(l, r):', '  if l >= r: return', '  pivot = a[r]; i = l', '  for j in l .. r-1:', '    if a[j] < pivot: swap(a[i], a[j]); i += 1', L('  swap(a[i], a[r])  # опорный на место', '  swap(a[i], a[r])  # pivot into place'), '  quick(l, i-1); quick(i+1, r)'],
  make: (api) => Algo.shuffled(api, 12),
  run(a) {
    a = a.slice(); const F = [], done = [];
    const p = (l, t, hi = {}, range, marks = {}) => F.push({ s: { a: a.slice(), hi, range, done: done.slice(), marks }, l, t });
    (function quick(l, r) {
      if (l > r) return;
      if (l === r) { done.push(l); return; }
      const pivot = a[r]; let i = l;
      p(2, L(`Опорный: ${pivot}`, `Pivot: ${pivot}`), { [r]: '#a371f7' }, [l, r], { [r]: 'P' });
      for (let j = l; j < r; j++) {
        p(4, `${a[j]} < ${pivot}?`, { [j]: 'warn', [r]: '#a371f7' }, [l, r], { [i]: 'i', [r]: 'P' });
        if (a[j] < pivot) {
          [a[i], a[j]] = [a[j], a[i]];
          p(4, L(`Да — в левую часть (меняем позиции ${i} и ${j})`, `Yes — to the left part (swap positions ${i} and ${j})`), { [i]: 'bad', [j]: 'bad', [r]: '#a371f7' }, [l, r], { [r]: 'P' });
          i++;
        }
      }
      [a[i], a[r]] = [a[r], a[i]];
      done.push(i);
      p(5, L(`Опорный ${pivot} встал на место ${i}`, `Pivot ${pivot} settled at position ${i}`), { [i]: 'good' }, [l, r]);
      quick(l, i - 1); quick(i + 1, r);
    })(0, a.length - 1);
    F.push({ s: { a: a.slice(), done: a.map((_, k) => k) }, l: 6, t: L('Готово!', 'Done!') });
    return F;
  },
  draw: Algo.bars,
}));
