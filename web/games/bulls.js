// Быки и коровы — дедукция: угадай код по подсказкам
Arcade.register({
  tiers: true, // в личной игре длина кода: 3 → 4 → 4 → 5
  howto: 'Компьютер загадал код из разных цифр (обычно 4; в личной игре длина растёт с успехами). Вводи догадки: 🐂 бык — цифра на своём месте, 🐄 корова — цифра есть, но в другом месте. Угадай за минимум попыток (максимум 12).',
  start(api) {
    const L = [3, 4, 4, 5][api.tier - 1], MAX = L >= 5 ? 15 : 12;
    const secret = api.shuffle([...'0123456789']).slice(0, L).join('');
    const box = api.el('div', 'fill');
    box.style.justifyContent = 'flex-start';
    const hist = api.el('div', '', box);
    hist.style.cssText = 'width:min(92vw,380px);flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-top:8px';
    const shown = api.el('div', 'learn-q', box);
    shown.style.letterSpacing = '10px';
    const pad = api.el('div', 'grid', box);
    pad.style.cssText += ';grid-template-columns:repeat(6,1fr);gap:6px;max-width:min(92vw,380px)';
    const keys = {};
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫']) {
      const b = api.el('button', 'tile', pad, k);
      b.style.cssText = 'aspect-ratio:1.2;font-size:22px';
      b.dataset.k = k; keys[k] = b;
    }
    let guess = '', tries = 0, over = false;
    const draw = () => {
      shown.textContent = (guess + '_____').slice(0, L);
      for (const d of '0123456789') keys[d].disabled = guess.includes(d) || over;
    };
    function submit() {
      tries++; api.setScore(tries);
      let bulls = 0, cows = 0;
      [...guess].forEach((d, i) => { if (secret[i] === d) bulls++; else if (secret.includes(d)) cows++; });
      const row = api.el('div', 'tile', hist);
      row.style.cssText = 'aspect-ratio:auto;justify-content:space-between;padding:8px 14px;font-size:20px;flex:none';
      row.innerHTML = `<span style="letter-spacing:6px">${guess}</span><span>🐂 ${bulls} &nbsp; 🐄 ${cows}</span>`;
      hist.scrollTop = hist.scrollHeight;
      guess = '';
      if (bulls === L) { over = true; api.haptic('success'); draw(); return api.after(700, () => api.end(tries)); }
      api.haptic(bulls ? 'light' : 'select');
      if (tries >= MAX) {
        over = true; draw();
        const r = api.el('div', 'hint', hist, `Не угадал — был код ${secret}`);
        r.style.textAlign = 'center';
        return api.after(1800, () => api.end(null));
      }
      draw();
    }
    api.on(pad, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled || over) return;
      if (b.dataset.k === '⌫') guess = guess.slice(0, -1);
      else guess += b.dataset.k;
      draw();
      if (guess.length === L) submit();
    });
    draw();
  },
});
