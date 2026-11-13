// Сортировка выбором
Arcade.register(Algo.viz({
  about: 'Ищем минимум в неотсортированной части и ставим его в начало этой части. Всегда ровно n−1 обменов.',
  complexity: 'O(n²) время всегда, O(1) память',
  code: ['for i in 0 .. n-2:', '  m = i', '  for j in i+1 .. n-1:', '    if a[j] < a[m]: m = j', '  swap(a[i], a[m])'],
  make: (api) => Algo.shuffled(api, 12),
  run(a) {
    a = a.slice(); const F = [], done = [];
    const p = (l, t, hi = {}, marks = {}) => F.push({ s: { a: a.slice(), hi, done: done.slice(), marks }, l, t });
    for (let i = 0; i < a.length - 1; i++) {
      let m = i;
      p(1, `Ищем минимум начиная с позиции ${i}`, { [i]: 'warn' }, { [m]: 'min' });
      for (let j = i + 1; j < a.length; j++) {
        p(3, `${a[j]} < ${a[m]}?`, { [j]: 'warn' }, { [m]: 'min' });
        if (a[j] < a[m]) { m = j; p(3, `Новый минимум: ${a[m]}`, { [m]: '#a371f7' }, { [m]: 'min' }); }
      }
      [a[i], a[m]] = [a[m], a[i]];
      done.push(i);
      p(4, `Ставим ${a[i]} на позицию ${i}`, { [i]: 'bad', [m]: 'bad' });
    }
    done.push(a.length - 1); p(4, 'Готово!');
    return F;
  },
  draw: Algo.bars,
}));
