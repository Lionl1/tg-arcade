// Бинарный поиск
Arcade.register(Algo.viz({
  about: 'В отсортированном массиве смотрим на середину: если искомое меньше — отбрасываем правую половину, иначе левую. Каждый шаг вдвое сужает поиск.',
  complexity: 'O(log n): для миллиона элементов — не больше 20 шагов',
  code: ['lo, hi = 0, n-1', 'while lo <= hi:', '  mid = (lo + hi) // 2', '  if a[mid] == x: return mid', '  if a[mid] < x: lo = mid + 1', '  else: hi = mid - 1', 'return -1  # не нашли'],
  make(api) {
    const set = new Set(); while (set.size < 15) set.add(api.randi(98) + 1);
    const a = [...set].sort((x, y) => x - y);
    return { a, x: api.rand() < 0.8 ? api.pick(a) : api.randi(98) + 1 };
  },
  run({ a, x }) {
    const F = [];
    const p = (l, t, lo, hi, mid, found) => {
      const h = {}; for (let k = 0; k < a.length; k++) if (k < lo || k > hi) h[k] = 'hint';
      if (mid != null) h[mid] = found ? 'good' : 'warn';
      const marks = {}; if (lo <= hi) { marks[lo] = 'lo'; marks[hi] = (marks[hi] ? 'lo/' : '') + 'hi'; } if (mid != null) marks[mid] = 'mid';
      F.push({ s: { a, hi: h, marks, x }, l, t });
    };
    let lo = 0, hi = a.length - 1;
    p(0, `Ищем ${x}`, lo, hi);
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      p(2, `Середина: a[${mid}] = ${a[mid]}`, lo, hi, mid);
      if (a[mid] === x) { p(3, `Нашли ${x} на позиции ${mid}!`, lo, hi, mid, true); return F; }
      if (a[mid] < x) { lo = mid + 1; p(4, `${a[mid]} < ${x} — ищем правее`, lo, hi); } else { hi = mid - 1; p(5, `${a[mid]} > ${x} — ищем левее`, lo, hi); }
    }
    p(6, `${x} нет в массиве`, 1, 0);
    return F;
  },
  draw(ctx, W, H, f, C) {
    const { a, hi = {}, marks = {}, x } = f.s;
    const n = a.length, c = Math.min(44, (W - 16) / n), ox = (W - c * n) / 2, y = H / 2 - c / 2;
    ctx.font = `700 ${c * 0.4}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.fg; ctx.fillText(`ищем: ${x}`, W / 2, y - 40);
    a.forEach((v, k) => {
      ctx.fillStyle = hi[k] === 'hint' ? 'rgba(127,127,127,.18)' : hi[k] ? C[hi[k]] : C.accent;
      ctx.fillRect(ox + k * c + 2, y, c - 4, c);
      ctx.fillStyle = hi[k] === 'hint' ? C.hint : '#fff'; ctx.fillText(v, ox + k * c + c / 2, y + c / 2);
      if (marks[k]) { ctx.fillStyle = C.warn; ctx.font = `600 ${Math.max(9, c * 0.28)}px system-ui`; ctx.fillText(marks[k], ox + k * c + c / 2, y + c + 14); ctx.font = `700 ${c * 0.4}px system-ui`; }
    });
    ctx.textBaseline = 'alphabetic';
  },
}));
