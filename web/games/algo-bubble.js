// Сортировка пузырьком
Arcade.register(Algo.viz({
  about: L('Идём по массиву и меняем соседей, если левый больше правого. После каждого прохода самый большой элемент «всплывает» в конец.', 'Walk the array and swap neighbours when the left one is larger. After each pass the largest element “bubbles up” to the end.'),
  complexity: L('O(n²) время в худшем и среднем, O(n) — если массив уже отсортирован (с флагом обмена); O(1) память', 'O(n²) time in the worst and average case, O(n) if the array is already sorted (with a swap flag); O(1) memory'),
  code: ['for i in 0 .. n-2:', '  swapped = false', '  for j in 0 .. n-2-i:', '    if a[j] > a[j+1]:', '      swap(a[j], a[j+1]); swapped = true', L('  if not swapped: break  # уже отсортирован', '  if not swapped: break  # already sorted')],
  make: (api) => Algo.shuffled(api, 12),
  run(a) {
    a = a.slice(); const F = [], done = [];
    const p = (l, t, hi = {}) => F.push({ s: { a: a.slice(), hi, done: done.slice() }, l, t });
    p(0, L('Начинаем: будем сравнивать соседние пары', 'Start: we will compare neighbouring pairs'));
    for (let i = 0; i < a.length - 1; i++) {
      let swapped = false;
      for (let j = 0; j < a.length - 1 - i; j++) {
        p(3, L(`Сравниваем ${a[j]} и ${a[j + 1]}`, `Compare ${a[j]} and ${a[j + 1]}`), { [j]: 'warn', [j + 1]: 'warn' });
        if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; swapped = true; p(4, L(`${a[j + 1]} > ${a[j]} — меняем местами`, `${a[j + 1]} > ${a[j]} — swap them`), { [j]: 'bad', [j + 1]: 'bad' }); }
      }
      done.push(a.length - 1 - i);
      p(1, L(`Проход ${i + 1} окончен: ${a[a.length - 1 - i]} на своём месте`, `Pass ${i + 1} done: ${a[a.length - 1 - i]} is in place`));
      if (!swapped) { for (let k = 0; k < a.length; k++) if (!done.includes(k)) done.push(k); p(5, L('Обменов не было — массив отсортирован', 'No swaps — the array is sorted')); return F; }
    }
    done.push(0); p(5, L('Готово!', 'Done!'));
    return F;
  },
  draw: Algo.bars,
}));
