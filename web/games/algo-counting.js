// Сортировка подсчётом
Arcade.register(Algo.viz({
  about: L('Не сравниваем элементы вообще: считаем, сколько раз встречается каждое значение, а потом выписываем значения по порядку. Работает, когда значения — небольшие целые числа.', 'No comparisons at all: count how many times each value occurs, then write the values out in order. Works when the values are small integers.'),
  complexity: L('O(n + k), где k — диапазон значений; O(k) памяти', 'O(n + k), where k is the value range; O(k) memory'),
  code: ['count = [0] * (max + 1)', 'for x in a: count[x] += 1', 'for value in 0..max:', L('  выписать value count[value] раз', '  write value count[value] times')],
  make(api) { return [...Array(12)].map(() => api.randi(10)); },
  run(a) {
    const F = [], count = new Array(10).fill(0), out = [];
    const p = (l, t, i, v) => F.push({ s: { a, count: count.slice(), out: out.slice(), i, v }, l, t });
    p(0, L('Заводим счётчики для значений 0–9', 'Set up counters for values 0–9'));
    a.forEach((x, i) => { count[x]++; p(1, L(`Встретили ${x} → count[${x}] = ${count[x]}`, `Saw ${x} → count[${x}] = ${count[x]}`), i, x); });
    for (let v = 0; v < 10; v++) {
      for (let t = 0; t < count[v]; t++) { out.push(v); }
      if (count[v]) p(3, L(`Выписываем ${v} × ${count[v]}`, `Write ${v} × ${count[v]}`), -1, v);
    }
    p(3, L(`Готово: ${out.join(' ')}`, `Done: ${out.join(' ')}`), -1, -1);
    return F;
  },
  draw(ctx, W, H, f, C) {
    const { a, count, out, i, v } = f.s;
    const cell = Math.min(30, (W - 20) / 12), rowY = [30, H / 2, H - 50];
    ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const row = (arr, y, hiIdx, label, color) => {
      ctx.fillStyle = C.hint; ctx.textAlign = 'left'; ctx.fillText(label, 8, y - 16); ctx.textAlign = 'center';
      arr.forEach((x, k) => {
        const X = 10 + k * (cell + 2);
        ctx.fillStyle = k === hiIdx ? C.warn : color; ctx.fillRect(X, y, cell, cell);
        ctx.fillStyle = '#fff'; ctx.fillText(x, X + cell / 2, y + cell / 2);
      });
    };
    row(a, rowY[0], i, L('Массив', 'Array'), C.accent);
    ctx.fillStyle = C.hint; ctx.textAlign = 'left'; ctx.fillText(L('count[значение]', 'count[value]'), 8, rowY[1] - 16); ctx.textAlign = 'center';
    count.forEach((c, k) => {
      const X = 10 + k * (cell + 2);
      ctx.fillStyle = k === v ? C.warn : 'rgba(127,127,127,.25)'; ctx.fillRect(X, rowY[1], cell, cell);
      ctx.fillStyle = C.fg; ctx.fillText(c, X + cell / 2, rowY[1] + cell / 2);
      ctx.fillStyle = C.hint; ctx.fillText(k, X + cell / 2, rowY[1] + cell + 10);
    });
    row(out, rowY[2], -1, L('Результат', 'Result'), C.good);
    ctx.textBaseline = 'alphabetic';
  },
}));
