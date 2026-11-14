// Стек и очередь: одни и те же операции, разный порядок выхода (LIFO и FIFO)
Arcade.register(Algo.viz({
  about: L('Стек — «последним пришёл, первым ушёл» (LIFO): стопка тарелок, кнопка «Назад». Очередь — «первым пришёл, первым ушёл» (FIFO): очередь в магазине, задачи на печать. Слева и справа — одинаковые операции.', 'A stack is “last in, first out” (LIFO): a pile of plates, the Back button. A queue is “first in, first out” (FIFO): a shop line, print jobs. Left and right run the same operations.'),
  complexity: 'push / pop / enqueue / dequeue — O(1)',
  code: L(['стек.push(x)      # кладём наверх', 'стек.pop()        # снимаем ВЕРХНИЙ (последний)', 'очередь.enqueue(x) # встаём в конец', 'очередь.dequeue()  # уходит ПЕРВЫЙ в очереди'], ['stack.push(x)      # put on top', 'stack.pop()        # take the TOP one (the last)', 'queue.enqueue(x)   # join at the back', 'queue.dequeue()    # the FIRST in line leaves']),
  make(api) {
    const ops = [];
    let size = 0;
    for (let k = 0; k < 14; k++) {
      if (size > 0 && (size >= 6 || api.rand() < 0.4)) { ops.push(['pop']); size--; } else { ops.push(['push', api.randi(90) + 10]); size++; }
    }
    return ops;
  },
  run(ops) {
    const st = [], q = [], F = [];
    const p = (l, t, hiS, hiQ, out) => F.push({ s: { st: st.slice(), q: q.slice(), hiS, hiQ, out }, l, t });
    p(0, L('Пусто. Выполним одинаковые операции со стеком и очередью', 'Empty. Let us run the same operations on a stack and a queue'));
    for (const [op, v] of ops) {
      if (op === 'push') { st.push(v); q.push(v); p(0, L(`Добавляем ${v}: в стек — наверх, в очередь — в конец`, `Add ${v}: on top of the stack, at the back of the queue`), st.length - 1, q.length - 1); }
      else { const a = st.pop(), b = q.shift(); p(1, L(`Забираем: из стека выходит ${a} (последний), из очереди — ${b} (первый)`, `Remove: ${a} leaves the stack (the last), ${b} leaves the queue (the first)`), null, null, [a, b]); }
    }
    return F;
  },
  draw(ctx, W, H, f, C) {
    const { st, q, hiS, hiQ, out } = f.s;
    const bw = Math.min(70, W * 0.22), bh = 30;
    ctx.font = '600 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.hint; ctx.fillText(L('Стек (LIFO)', 'Stack (LIFO)'), W * 0.22, 16); ctx.fillText(L('Очередь (FIFO) →', 'Queue (FIFO) →'), W * 0.66, 16);
    st.forEach((v, k) => {
      const x = W * 0.22 - bw / 2, y = H - 14 - (k + 1) * (bh + 4);
      ctx.fillStyle = k === hiS ? C.good : C.accent; ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = '#fff'; ctx.fillText(v, W * 0.22, y + bh / 2);
    });
    ctx.strokeStyle = C.hint; ctx.strokeRect(W * 0.22 - bw / 2 - 4, 30, bw + 8, H - 40);
    const qw = Math.min(46, (W * 0.5) / 7);
    q.forEach((v, k) => {
      const x = W * 0.44 + k * (qw + 4), y = H / 2 - 18;
      ctx.fillStyle = k === hiQ ? C.good : k === 0 ? C.warn : C.accent; ctx.fillRect(x, y, qw, 36);
      ctx.fillStyle = '#fff'; ctx.fillText(v, x + qw / 2, y + 18);
    });
    if (q.length) { ctx.fillStyle = C.warn; ctx.font = '600 11px system-ui'; ctx.fillText(L('выйдет первым', 'leaves first'), W * 0.44 + qw / 2, H / 2 + 34); }
    if (out) { ctx.fillStyle = C.bad; ctx.font = '700 15px system-ui'; ctx.fillText(L(`вышли: стек → ${out[0]}, очередь → ${out[1]}`, `out: stack → ${out[0]}, queue → ${out[1]}`), W / 2, H - 6 - 0); }
    ctx.textBaseline = 'alphabetic';
  },
}));
