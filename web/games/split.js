// Раздели счёт: кто сколько заплатил → кто кому сколько должен (минимум переводов)
Arcade.register({
  app: true,
  start(api) {
    const box = api.el('div', 'appbox');
    api.el('div', 'hint', box, L('Впиши, кто сколько заплатил (0 — если ничего). Посчитаю поровну и кто кому переводит.', 'Enter how much each person paid (0 if nothing). I will split it evenly and work out who pays whom.'));
    const list = api.el('div', '', box);
    list.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    const row = api.el('div', 'toolbar', box);
    const add = api.el('button', 'btn ghost', row, L('➕ Участник', '➕ Person'));
    const calc = api.el('button', 'btn', row, L('🧮 Посчитать', '🧮 Calculate'));
    const out = api.el('pre', '', box);
    out.style.cssText = 'white-space:pre-wrap;font:inherit;background:var(--card);border-radius:14px;padding:12px;margin:0;min-height:60px;-webkit-user-select:text;user-select:text';
    let result = '';

    function person(name = '', paid = '') {
      const r = api.el('div', '', list);
      r.style.cssText = 'display:flex;gap:6px';
      const n = api.el('input', '', r); n.type = 'text'; n.placeholder = L('Имя', 'Name'); n.value = name;
      const p = api.el('input', '', r); p.type = 'number'; p.placeholder = '0'; p.value = paid; p.style.width = '110px'; p.inputMode = 'decimal';
      const del = api.el('button', 'btn ghost', r, '✕'); del.style.flex = 'none';
      api.on(del, 'click', () => r.remove());
    }
    const rub = (v) => (LANG === 'en' ? '$' + Math.round(v * 100) / 100 : `${Math.round(v * 100) / 100}`.replace('.', ',') + ' ₽');
    function compute() {
      const people = [...list.children].map((r) => {
        const [n, p] = r.querySelectorAll('input');
        return { name: n.value.trim() || L('Без имени', 'No name'), paid: Math.max(0, parseFloat(String(p.value).replace(',', '.')) || 0) };
      });
      if (people.length < 2) return L('Нужно хотя бы 2 участника', 'At least 2 people are needed');
      const total = people.reduce((s, p) => s + p.paid, 0), each = total / people.length;
      const bal = people.map((p) => ({ name: p.name, v: Math.round((p.paid - each) * 100) }));
      const debt = bal.filter((b) => b.v < 0).sort((a, b) => a.v - b.v), cred = bal.filter((b) => b.v > 0).sort((a, b) => b.v - a.v);
      const moves = [];
      // жадно: самый большой долг гасим самому большому кредитору — число переводов ≤ участников − 1
      while (debt.length && cred.length) {
        const d = debt[0], c = cred[0], x = Math.min(-d.v, c.v);
        moves.push(`${d.name} → ${c.name}: ${rub(x / 100)}`);
        d.v += x; c.v -= x;
        if (!d.v) debt.shift();
        if (!c.v) cred.shift();
      }
      return L(`🧾 Итого: ${rub(total)}, с каждого по ${rub(each)}\n\n`, `🧾 Total: ${rub(total)}, ${rub(each)} each\n\n`) + (moves.length ? moves.join('\n') : L('Все в расчёте 👌', 'Everyone is square 👌'));
    }
    api.on(add, 'click', () => person());
    api.on(calc, 'click', () => { result = compute(); out.textContent = result; api.haptic('light'); });
    api.shareBar(box, { text: () => result || compute() });
    person(L('Аня', 'Anna'), L('1200', '60')); person(L('Борис', 'Ben'), '0'); person(L('Вика', 'Chloe'), L('300', '15'));
  },
});
