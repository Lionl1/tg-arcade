// Быстрая сортировка (схема Ломуто)
Arcade.register(Algo.viz({
  about: 'Выбираем опорный элемент (последний), раскладываем: меньшие — влево, большие — вправо. Опорный встаёт на своё место, повторяем для двух частей.',
  complexity: 'O(n log n) в среднем, O(n²) в худшем (неудачные опорные); O(log n) памяти на рекурсию',
  code: ['quick(l, r):', '  if l >= r: return', '  pivot = a[r]; i = l', '  for j in l .. r-1:', '    if a[j] < pivot: swap(a[i], a[j]); i += 1', '  swap(a[i], a[r])  # опорный на место', '  quick(l, i-1); quick(i+1, r)'],
  make: (api) => Algo.shuffled(api, 12),
  run(a) {
    a = a.slice(); const F = [], done = [];
    const p = (l, t, hi = {}, range, marks = {}) => F.push({ s: { a: a.slice(), hi, range, done: done.slice(), marks }, l, t });
    (function quick(l, r) {
      if (l > r) return;
      if (l === r) { done.push(l); return; }
      const pivot = a[r]; let i = l;
      p(2, `Опорный: ${pivot}`, { [r]: '#a371f7' }, [l, r], { [r]: 'P' });
      for (let j = l; j < r; j++) {
        p(4, `${a[j]} < ${pivot}?`, { [j]: 'warn', [r]: '#a371f7' }, [l, r], { [i]: 'i', [r]: 'P' });
        if (a[j] < pivot) {
          [a[i], a[j]] = [a[j], a[i]];
          p(4, `Да — в левую часть (меняем позиции ${i} и ${j})`, { [i]: 'bad', [j]: 'bad', [r]: '#a371f7' }, [l, r], { [r]: 'P' });
          i++;
        }
      }
      [a[i], a[r]] = [a[r], a[i]];
      done.push(i);
      p(5, `Опорный ${pivot} встал на место ${i}`, { [i]: 'good' }, [l, r]);
      quick(l, i - 1); quick(i + 1, r);
    })(0, a.length - 1);
    F.push({ s: { a: a.slice(), done: a.map((_, k) => k) }, l: 6, t: 'Готово!' });
    return F;
  },
  draw: Algo.bars,
}));
