// Сортировка пузырьком
Arcade.register(Algo.viz({
  about: 'Идём по массиву и меняем соседей, если левый больше правого. После каждого прохода самый большой элемент «всплывает» в конец.',
  complexity: 'O(n²) время в худшем и среднем, O(n) — если массив уже отсортирован (с флагом обмена); O(1) память',
  code: ['for i in 0 .. n-2:', '  swapped = false', '  for j in 0 .. n-2-i:', '    if a[j] > a[j+1]:', '      swap(a[j], a[j+1]); swapped = true', '  if not swapped: break  # уже отсортирован'],
  make: (api) => Algo.shuffled(api, 12),
  run(a) {
    a = a.slice(); const F = [], done = [];
    const p = (l, t, hi = {}) => F.push({ s: { a: a.slice(), hi, done: done.slice() }, l, t });
    p(0, 'Начинаем: будем сравнивать соседние пары');
    for (let i = 0; i < a.length - 1; i++) {
      let swapped = false;
      for (let j = 0; j < a.length - 1 - i; j++) {
        p(3, `Сравниваем ${a[j]} и ${a[j + 1]}`, { [j]: 'warn', [j + 1]: 'warn' });
        if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; swapped = true; p(4, `${a[j + 1]} > ${a[j]} — меняем местами`, { [j]: 'bad', [j + 1]: 'bad' }); }
      }
      done.push(a.length - 1 - i);
      p(1, `Проход ${i + 1} окончен: ${a[a.length - 1 - i]} на своём месте`);
      if (!swapped) { for (let k = 0; k < a.length; k++) if (!done.includes(k)) done.push(k); p(5, 'Обменов не было — массив отсортирован'); return F; }
    }
    done.push(0); p(5, 'Готово!');
    return F;
  },
  draw: Algo.bars,
}));
