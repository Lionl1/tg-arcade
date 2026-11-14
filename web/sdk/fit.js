/* Движок физических тренировок: подходы с повторениями, упражнения на время, отдых, круговые.
 * Упражнения и фото — открытый набор free-exercise-db (Unlicense, общественное достояние).
 *
 *   Fit.workout({
 *     howto: L('…', '…'),
 *     plan(lv) { return [...Fit.sets('Pullups', 3, 5, 90), ...Fit.circuit([...], 3, 20, 60)]; },
 *   })
 *
 * Уровни программы — дни прогрессии: lv растёт → больше повторений/подходов. В свободной игре lv задаёт ступень 1–4.
 * Счёт — процент выполненного плана (повторения; секунды считаются по 1 за 3 с). 100 = всё по плану.
 */
(() => {
  'use strict';
  const IMG = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';
  let DB = null;
  const dbReady = fetch('games/data/fit.json').then((r) => r.json()).then((d) => { DB = d.exercises; });
  const exName = (id) => (DB[id] ? L(DB[id].ru, DB[id].en) : id);

  /** n подходов по reps повторений с отдыхом rest секунд */
  const sets = (ex, n, reps, rest = 60) => [...Array(n)].map((_, i) => ({ ex, reps, rest: i < n - 1 ? rest : Math.min(rest, 60), set: i + 1, of: n }));
  /** удержание/работа на время */
  const hold = (ex, n, sec, rest = 30) => [...Array(n)].map((_, i) => ({ ex, sec, rest, set: i + 1, of: n }));
  /** круговая: список [ex, {reps}|{sec}], rounds кругов, отдых между упражнениями и между кругами */
  const circuit = (list, rounds, rest = 15, roundRest = 60) => {
    const out = [];
    for (let r = 1; r <= rounds; r++) list.forEach(([ex, amt], i) => out.push({ ex, ...amt, rest: i < list.length - 1 ? rest : r < rounds ? roundRest : 0, round: r, rounds }));
    return out;
  };
  const units = (s) => (s.reps || 0) + (s.sec ? s.sec / 3 : 0);

  function workout(cfg) {
    return {
      tiers: true,
      fit: cfg, // для автопроверки программ
      howto: cfg.howto,
      async start(api) {
        await dbReady;
        const lv = api.mode === 'level' ? api.level : [1, 4, 8, 14][api.tier - 1];
        const plan = cfg.plan(lv).filter((s) => DB[s.ex]);
        const total = plan.reduce((a, s) => a + units(s), 0);
        let done = 0, i = 0, cancel = () => {};
        const box = api.el('div', 'appbox fit');
        // не даём экрану погаснуть во время подходов и отдыха
        let lock = null;
        const keepAwake = async () => { try { lock = await navigator.wakeLock.request('screen'); } catch (e) { /* не поддерживается — не страшно */ } };
        const onVis = () => { if (document.visibilityState === 'visible') keepAwake(); };
        keepAwake(); document.addEventListener('visibilitychange', onVis);
        api.onDispose(() => { document.removeEventListener('visibilitychange', onVis); try { lock && lock.release(); } catch (e) { /* noop */ } });

        const beep = (f = 880) => api.tone(f, 120, 'triangle');
        function photo(parent, id, big) {
          const w = api.el('div', 'fit-img' + (big ? ' big' : ''), parent);
          const im = document.createElement('img');
          im.alt = exName(id); im.src = IMG + DB[id].img[0];
          im.onerror = () => { w.textContent = '💪'; };
          w.appendChild(im);
          if (DB[id].img[1] && big) { let k = 0; const t = setInterval(() => { k ^= 1; im.src = IMG + DB[id].img[k]; }, 900); api.onDispose(() => clearInterval(t)); }
          return w;
        }

        // ---------- план тренировки ----------
        function intro() {
          box.innerHTML = '';
          const mins = Math.round(plan.reduce((a, s) => a + (s.sec || (s.reps || 0) * 3) + (s.rest || 0), 0) / 60);
          api.el('div', 'learn-q', box, `${api.mode === 'level' ? L(`День ${lv}`, `Day ${lv}`) + ' · ' : ''}≈${mins} ${L('мин', 'min')}`).style.fontSize = '22px';
          const list = api.el('div', 'fit-plan', box);
          const seen = new Map();
          for (const s of plan) {
            const k = s.ex + (s.reps ? 'r' + s.reps : 's' + s.sec);
            if (seen.has(k)) { seen.get(k).n++; continue; }
            seen.set(k, { s, n: 1 });
          }
          for (const { s, n } of seen.values()) {
            const r = api.el('div', 'fit-row', list);
            photo(r, s.ex, false);
            api.el('span', '', r, exName(s.ex));
            api.el('b', '', r, `${n > 1 ? n + ' × ' : ''}${s.reps ? s.reps : s.sec + L(' с', ' s')}`);
          }
          api.el('div', 'hint', box, L('⚠️ Слушай тело: при боли остановись. Если есть проблемы со здоровьем — сначала посоветуйся с врачом.',
            '⚠️ Listen to your body: stop if anything hurts. If you have health issues, check with a doctor first.')).style.fontSize = '12px';
          const go = api.el('button', 'btn', box, L('▶ Начать', '▶ Start'));
          go.style.flex = 'none';
          api.on(go, 'click', () => step());
        }

        // ---------- упражнение ----------
        function step() {
          cancel();
          if (i >= plan.length) return api.end(Math.round((100 * done) / Math.max(1, total)));
          const s = plan[i];
          box.innerHTML = '';
          api.setScore(Math.round((100 * done) / Math.max(1, total)));
          const head = api.el('div', 'hint', box, `${i + 1}/${plan.length}` + (s.of ? ` · ${L('подход', 'set')} ${s.set}/${s.of}` : s.rounds ? ` · ${L('круг', 'round')} ${s.round}/${s.rounds}` : ''));
          head.style.fontWeight = '700';
          photo(box, s.ex, true);
          api.el('div', 'learn-q', box, exName(s.ex)).style.fontSize = '22px';
          const cue = api.el('div', 'hint', box, L(DB[s.ex].cue_ru, DB[s.ex].cue_en));
          cue.style.textAlign = 'center';
          if (s.reps) {
            let got = s.reps;
            const row = api.el('div', 'fit-reps', box);
            const minus = api.el('button', 'btn ghost', row, '−');
            const val = api.el('b', '', row, String(got));
            const plus = api.el('button', 'btn ghost', row, '+');
            api.el('div', 'hint', box, L(`Цель: ${s.reps}. Сделал меньше или больше — поправь число.`, `Target: ${s.reps}. Did fewer or more — adjust the number.`)).style.fontSize = '12px';
            api.on(minus, 'click', () => { got = Math.max(0, got - 1); val.textContent = got; api.haptic('select'); });
            api.on(plus, 'click', () => { got++; val.textContent = got; api.haptic('select'); });
            const ok = api.el('button', 'btn', box, L('✅ Готово', '✅ Done'));
            ok.style.flex = 'none';
            api.on(ok, 'click', () => { done += Math.min(got, s.reps * 1.5); api.haptic('success'); next(s); });
          } else {
            let left = s.sec;
            const t = api.el('div', 'fit-timer', box, String(left));
            const skip = api.el('button', 'btn ghost', box, L('⏭ Пропустить', '⏭ Skip'));
            skip.style.flex = 'none';
            const timer = setInterval(() => {
              left--; t.textContent = String(Math.max(0, left));
              if (left <= 3 && left > 0) beep(660);
              if (left <= 0) { clearInterval(timer); done += s.sec / 3; beep(990); api.haptic('success'); next(s); }
            }, 1000);
            cancel = () => clearInterval(timer);
            api.onDispose(() => clearInterval(timer));
            api.on(skip, 'click', () => { cancel(); done += (s.sec - left) / 3; next(s); });
            beep(880);
          }
        }

        // ---------- отдых ----------
        function next(s) {
          cancel();
          i++;
          if (!s.rest || i >= plan.length) return step();
          box.innerHTML = '';
          api.el('div', 'learn-q', box, L('😮‍💨 Отдых', '😮‍💨 Rest')).style.fontSize = '22px';
          let left = s.rest;
          const t = api.el('div', 'fit-timer rest', box, String(left));
          const n = plan[i];
          api.el('div', 'hint', box, `${L('Дальше', 'Next')}: ${exName(n.ex)} — ${n.reps ? n.reps : n.sec + L(' с', ' s')}`);
          photo(box, n.ex, false);
          const row = api.el('div', 'row', box);
          const more = api.el('button', 'btn ghost', row, L('+15 с', '+15 s'));
          const skip = api.el('button', 'btn', row, L('▶ Дальше', '▶ Next'));
          const timer = setInterval(() => {
            left--; t.textContent = String(Math.max(0, left));
            if (left <= 3 && left > 0) beep(660);
            if (left <= 0) { clearInterval(timer); step(); }
          }, 1000);
          cancel = () => clearInterval(timer);
          api.onDispose(() => clearInterval(timer));
          api.on(more, 'click', () => { left += 15; t.textContent = String(left); });
          api.on(skip, 'click', () => step());
        }

        intro();
      },
    };
  }

  window.Fit = { workout, sets, hold, circuit, dbReady, name: (id) => exName(id) };
})();
