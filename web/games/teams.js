// Команды: честно делим участников на команды (на сервере), бот публикует составы
Arcade.register({
  app: true,
  start(api) {
    const box = api.el('div', 'appbox');
    api.el('div', 'hint', box, L('Участники — по одному в строке. Делит сервер, бот публикует составы в чат.', 'Players — one per line. The server splits them and the bot posts the teams to the chat.'));
    const ta = api.el('textarea', '', box);
    ta.placeholder = L('Аня\nБорис\nВика\nГоша', 'Anna\nBen\nChloe\nDan');
    const row = api.el('div', 'toolbar', box);
    let k = 2;
    const kBtn = api.el('button', 'btn ghost', row);
    const go = api.el('button', 'btn', row, L('👥 Разделить', '👥 Split'));
    const out = api.el('div', '', box);
    const label = () => { kBtn.textContent = L(`Команд: ${k}`, `Teams: ${k}`); };
    api.on(kBtn, 'click', () => { k = k >= 6 ? 2 : k + 1; label(); });
    api.on(go, 'click', async () => {
      const items = ta.value.split('\n').map((s) => s.trim()).filter(Boolean);
      go.disabled = true;
      try {
        const d = await api.roll({ kind: 'teams', items, teams: k, post: true });
        out.innerHTML = '';
        d.teams.forEach((t, i) => {
          const c = api.el('div', 'panel', out);
          c.style.cssText = `padding:10px 14px;border-radius:14px;background:color-mix(in srgb, ${api.colors.palette[i % 8]} 22%, var(--card));margin-bottom:8px`;
          c.innerHTML = L(`<b>Команда ${i + 1}</b><div>${t.map((s) => s.replace(/[&<>]/g, '')).join(', ')}</div>`, `<b>Team ${i + 1}</b><div>${t.map((s) => s.replace(/[&<>]/g, '')).join(', ')}</div>`);
        });
        api.toast(d.sent ? (d.group ? L('Составы отправлены в чат', 'Teams sent to the chat') : L('Отправил в личку', 'Sent to your private chat')) : L('Готово', 'Done'));
        api.haptic('success');
      } catch (e) { api.toast(e.message); }
      go.disabled = false;
    });
    label();
  },
});
