// «Будь сортировкой»: выполняй алгоритм сам — делай ровно те обмены, которые сделал бы он
Arcade.register({
  howto: 'Сверху — правило алгоритма. Тапни два столбика, которые алгоритм поменяет местами следующими. Ошиблись — подсказка и минус 3 секунды. Пузырёк → выбор → вставки. 2 минуты.',
  start(api) {
    const ALGOS = {
      bubble: { name: 'Пузырёк', rule: 'Идём слева направо и меняем СОСЕДЕЙ, если левый больше правого. Проход за проходом.' },
      selection: { name: 'Выбором', rule: 'Находим МИНИМУМ в неотсортированной части и меняем его с первым элементом этой части.' },
      insertion: { name: 'Вставками', rule: 'Берём следующий элемент и двигаем его ВЛЕВО обменами с соседом, пока сосед больше.' },
    };
    // последовательность обменов, которую сделает алгоритм
    function swaps(kind, a) {
      a = a.slice(); const out = [];
      if (kind === 'bubble') {
        for (let i = 0; i < a.length - 1; i++) for (let j = 0; j < a.length - 1 - i; j++) if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; out.push([j, j + 1]); }
      } else if (kind === 'selection') {
        for (let i = 0; i < a.length - 1; i++) { let m = i; for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j; if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; out.push([i, m]); } }
      } else {
        for (let i = 1; i < a.length; i++) for (let j = i; j > 0 && a[j - 1] > a[j]; j--) { [a[j - 1], a[j]] = [a[j], a[j - 1]]; out.push([j - 1, j]); }
      }
      return out;
    }
    const box = api.el('div', 'fill');
    const title = api.el('div', '', box); title.style.fontWeight = '800';
    const rule = api.el('div', 'hint', box); rule.style.textAlign = 'center';
    const row = api.el('div', '', box);
    row.style.cssText = 'display:flex;align-items:flex-end;gap:6px;height:min(40vh,240px);width:min(92vw,420px)';
    const info = api.el('div', 'hint', box);
    const tm = api.timer(120);
    let kind, arr, plan, step, sel = null, solved = 0;

    function next() {
      kind = ['bubble', 'selection', 'insertion'][Math.min(2, Math.floor(solved / 2))];
      do { arr = api.shuffle([...Array(api.score > 20 ? 8 : 6)].map((_, i) => (i + 1) * 10 + api.randi(9))); plan = swaps(kind, arr); } while (plan.length < 2);
      step = 0; sel = null;
      title.textContent = `Сортировка ${ALGOS[kind].name}`;
      rule.textContent = ALGOS[kind].rule;
      draw();
    }
    function draw(hint) {
      row.innerHTML = '';
      const max = Math.max(...arr);
      arr.forEach((v, i) => {
        const b = api.el('button', '', row);
        b.style.cssText = `flex:1;border:0;border-radius:8px 8px 4px 4px;height:${(v / max) * 100}%;color:#fff;font-weight:700;
          background:${i === sel ? 'var(--warn)' : hint && hint.includes(i) ? 'var(--good)' : 'var(--accent)'};display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px`;
        b.textContent = v; b.dataset.i = i;
      });
      info.textContent = `Обмен ${step + 1} из ${plan.length}`;
    }
    api.on(row, 'click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const i = +b.dataset.i;
      if (sel === null) { sel = i; api.haptic('select'); draw(); return; }
      if (sel === i) { sel = null; draw(); return; }
      const [x, y] = plan[step];
      if ((sel === x && i === y) || (sel === y && i === x)) {
        [arr[x], arr[y]] = [arr[y], arr[x]];
        step++; sel = null; api.addScore(1); api.haptic('light'); api.tone(600 + step * 30, 50);
        if (step >= plan.length) { solved++; api.haptic('success'); info.textContent = '✅ Отсортировано!'; draw(); api.after(700, next); return; }
        draw();
      } else {
        api.haptic('error'); api.shake(row); sel = null; tm.add(-3);
        draw([x, y]); // подсказка: какие два элемента поменял бы алгоритм
        info.textContent = `Алгоритм поменял бы ${arr[x]} и ${arr[y]}`;
      }
    });
    next();
  },
});
