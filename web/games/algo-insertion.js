// Сортировка вставками
Arcade.register(Algo.viz({
  about: 'Как карты в руке: берём следующий элемент и сдвигаем больших соседей вправо, пока не найдём ему место. Очень быстро на почти отсортированных данных.',
  complexity: 'O(n²) в худшем, O(n) на почти отсортированном; O(1) память; устойчивая',
  code: ['for i in 1 .. n-1:', '  key = a[i]; j = i - 1', '  while j >= 0 and a[j] > key:', '    a[j+1] = a[j]; j -= 1', '  a[j+1] = key'],
  make: (api) => Algo.shuffled(api, 12),
  run(a) {
    a = a.slice(); const F = [];
    const p = (l, t, hi = {}, range) => F.push({ s: { a: a.slice(), hi, range }, l, t });
    for (let i = 1; i < a.length; i++) {
      const key = a[i]; let j = i - 1;
      p(1, `Берём ${key}; слева уже отсортировано`, { [i]: '#a371f7' }, [0, i - 1]);
      while (j >= 0 && a[j] > key) {
        p(2, `${a[j]} > ${key} — сдвигаем вправо`, { [j]: 'warn', [j + 1]: '#a371f7' }, [0, i]);
        a[j + 1] = a[j]; j--;
        p(3, 'Сдвинули', { [j + 1]: 'bad' }, [0, i]);
      }
      a[j + 1] = key;
      p(4, `Вставляем ${key} на позицию ${j + 1}`, { [j + 1]: 'good' }, [0, i]);
    }
    F.push({ s: { a: a.slice(), done: a.map((_, k) => k) }, l: 4, t: 'Готово!' });
    return F;
  },
  draw: Algo.bars,
}));
