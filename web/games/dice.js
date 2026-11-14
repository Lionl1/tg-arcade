// Честные кубики, монетка и случайное число: бросает сервер, бот публикует результат в чат
Arcade.register({
  app: true,
  start(api) {
    const box = api.el('div', 'appbox');
    box.style.alignItems = 'center';
    const out = api.el('div', 'learn-q big', box, '🎲');
    out.style.minHeight = '1.3em';
    const sub = api.el('div', 'hint', box, L('Результат выбирает сервер, а бот сразу публикует его в чате — подделать нельзя.', 'The server picks the result and the bot posts it to the chat right away — it cannot be faked.'));
    sub.style.textAlign = 'center';
    const row1 = api.el('div', 'toolbar', box);
    let n = 1, sides = 6;
    const nBtn = api.el('button', 'btn ghost', row1);
    const sBtn = api.el('button', 'btn ghost', row1);
    const rollBtn = api.el('button', 'btn', row1, L('🎲 Бросить', '🎲 Roll'));
    const row2 = api.el('div', 'toolbar', box);
    const coinBtn = api.el('button', 'btn', row2, L('🪙 Монетка', '🪙 Coin'));
    const lo = api.el('input', '', row2); lo.type = 'number'; lo.value = 1; lo.style.width = '80px';
    const hi = api.el('input', '', row2); hi.type = 'number'; hi.value = 100; hi.style.width = '90px';
    const numBtn = api.el('button', 'btn', row2, L('🔢 Число', '🔢 Number'));
    const label = () => { nBtn.textContent = L(`Кубиков: ${n}`, `Dice: ${n}`); sBtn.textContent = L(`Граней: ${sides}`, `Sides: ${sides}`); };
    api.on(nBtn, 'click', () => { n = (n % 6) + 1; label(); });
    api.on(sBtn, 'click', () => { sides = { 6: 20, 20: 100, 100: 4, 4: 6 }[sides]; label(); });

    async function go(p, show) {
      [rollBtn, coinBtn, numBtn].forEach((b) => { b.disabled = true; });
      out.textContent = '…';
      try {
        const d = await api.roll({ ...p, post: true });
        out.textContent = show(d);
        sub.textContent = d.sent ? (d.group ? L('✅ Результат опубликован в чате', '✅ Result posted to the chat') : L('✅ Отправил в личку', '✅ Sent to your private chat')) : '';
        api.haptic('success');
      } catch (e) { out.textContent = '🎲'; api.toast(e.message); }
      [rollBtn, coinBtn, numBtn].forEach((b) => { b.disabled = false; });
    }
    const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    api.on(rollBtn, 'click', () => go({ kind: 'dice', n, sides }, (d) => (sides === 6 ? d.values.map((v) => FACES[v - 1]).join(' ') : d.values.join(' + ')) + (d.values.length > 1 ? ` = ${d.total}` : '')));
    api.on(coinBtn, 'click', () => go({ kind: 'coin' }, (d) => (d.heads ? '🦅 ' : '🪙 ') + d.value));
    api.on(numBtn, 'click', () => go({ kind: 'number', lo: +lo.value || 0, hi: +hi.value || 0 }, (d) => String(d.value)));
    label();
  },
});
