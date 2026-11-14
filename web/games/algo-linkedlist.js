// Разворот связного списка
Arcade.register(Algo.viz({
  about: L('Связный список: каждый узел хранит значение и ссылку на следующий. Чтобы развернуть его на месте, идём по узлам и перекидываем стрелку каждого узла на предыдущий. Нужны три указателя: prev, head, next.', 'A linked list: every node stores a value and a link to the next one. To reverse it in place, walk the nodes and point each node’s arrow at the previous one. Three pointers are needed: prev, head, next.'),
  complexity: L('O(n) время, O(1) памяти', 'O(n) time, O(1) memory'),
  code: ['prev = None', 'while head:', '  nxt = head.next', L('  head.next = prev   # разворачиваем стрелку', '  head.next = prev   # flip the arrow'), '  prev = head; head = nxt', L('return prev         # новая голова', 'return prev         # the new head')],
  make(api) { return [...Array(5)].map(() => api.randi(90) + 10); },
  run(vals) {
    const n = vals.length, next = vals.map((_, i) => (i + 1 < n ? i + 1 : null)), F = [];
    let prev = null, head = 0;
    const p = (l, t, nx) => F.push({ s: { vals, next: next.slice(), prev, head, nx }, l, t });
    p(0, L('prev = None, head — первый узел', 'prev = None, head is the first node'));
    while (head !== null) {
      const nx = next[head];
      p(2, L(`Запоминаем next = ${nx === null ? 'None' : vals[nx]}`, `Remember next = ${nx === null ? 'None' : vals[nx]}`), nx);
      next[head] = prev;
      p(3, L(`Стрелка ${vals[head]} теперь указывает на ${prev === null ? 'None' : vals[prev]}`, `The arrow of ${vals[head]} now points to ${prev === null ? 'None' : vals[prev]}`), nx);
      prev = head; head = nx;
      p(4, L('Сдвигаем prev и head вперёд', 'Move prev and head forward'), nx);
    }
    p(5, L(`Список развёрнут, новая голова — ${vals[prev]}`, `The list is reversed, the new head is ${vals[prev]}`), null);
    return F;
  },
  draw(ctx, W, H, f, C) {
    const { vals, next, prev, head, nx } = f.s;
    const n = vals.length, bw = Math.min(54, (W - 30) / n - 18), gap = (W - n * bw) / (n + 1), y = H / 2 - 18;
    const X = (i) => gap + i * (bw + gap);
    ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    vals.forEach((v, i) => {
      ctx.fillStyle = i === head ? C.warn : i === prev ? C.good : C.accent; ctx.fillRect(X(i), y, bw, 36);
      ctx.fillStyle = '#fff'; ctx.fillText(v, X(i) + bw / 2, y + 18);
      const t = next[i];
      ctx.strokeStyle = C.fg; ctx.fillStyle = C.fg; ctx.lineWidth = 2;
      if (t === null) { ctx.fillStyle = C.hint; ctx.fillText('∅', X(i) + bw / 2, y + 52); return; }
      const dir = t > i ? 1 : -1, x1 = dir > 0 ? X(i) + bw : X(i), x2 = dir > 0 ? X(t) : X(t) + bw, yy = y + (dir > 0 ? 10 : 26);
      ctx.beginPath(); ctx.moveTo(x1, yy); ctx.lineTo(x2, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, yy); ctx.lineTo(x2 - 7 * dir, yy - 5); ctx.lineTo(x2 - 7 * dir, yy + 5); ctx.fill();
    });
    const label = (i, txt, dy) => { if (i === null || i === undefined) return; ctx.fillStyle = C.hint; ctx.fillText(txt, X(i) + bw / 2, y + dy); };
    label(prev, 'prev', -14); label(head, 'head', -14); if (nx !== null && nx !== undefined && nx !== head) label(nx, 'next', 54);
    ctx.textBaseline = 'alphabetic';
  },
}));
