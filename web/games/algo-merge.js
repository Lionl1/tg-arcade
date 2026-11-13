// Сортировка слиянием
Arcade.register(Algo.viz({
  about: 'Разделяй и властвуй: делим массив пополам, сортируем половины рекурсивно и сливаем две отсортированные половины за один проход.',
  complexity: 'O(n log n) всегда; O(n) дополнительной памяти; устойчивая',
  code: ['sort(l, r):', '  if l >= r: return', '  m = (l + r) // 2', '  sort(l, m); sort(m+1, r)', '  merge: берём меньший из голов двух половин', '  копируем результат обратно в a[l..r]'],
  make: (api) => Algo.shuffled(api, 12),
  run(a) {
    a = a.slice(); const F = [];
    const p = (l, t, hi = {}, range) => F.push({ s: { a: a.slice(), hi, range }, l, t });
    (function sort(l, r) {
      if (l >= r) return;
      const m = (l + r) >> 1;
      p(2, `Делим [${l}..${r}] пополам по ${m}`, {}, [l, r]);
      sort(l, m); sort(m + 1, r);
      const out = []; let i = l, j = m + 1;
      while (i <= m && j <= r) {
        p(4, `Сравниваем головы: ${a[i]} и ${a[j]}`, { [i]: 'warn', [j]: 'warn' }, [l, r]);
        out.push(a[i] <= a[j] ? a[i++] : a[j++]);
      }
      while (i <= m) out.push(a[i++]);
      while (j <= r) out.push(a[j++]);
      out.forEach((v, k) => { a[l + k] = v; });
      const hi = {}; for (let k = l; k <= r; k++) hi[k] = 'good';
      p(5, `Слили [${l}..${r}]: ${out.join(', ')}`, hi, [l, r]);
    })(0, a.length - 1);
    F.push({ s: { a: a.slice(), done: a.map((_, k) => k) }, l: 5, t: 'Готово!' });
    return F;
  },
  draw: Algo.bars,
}));
