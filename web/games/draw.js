// Рисовалка: кисть, цвета, ластик, отмена. Готовый рисунок — в файл, в этот чат или в любой чат.
Arcade.register({
  app: true,
  start(api) {
    const COLORS = ['#111111', '#ffffff', '#e5534b', '#f0883e', '#e3b341', '#3fb950', '#39c5cf', '#4a90e2', '#a371f7', '#db61a2', '#8b5a2b', '#8b949e'];
    const SIZES = [3, 8, 18, 36];
    const box = api.el('div', 'appbox');
    const pal = api.el('div', 'toolbar', box);
    const tools = api.el('div', 'toolbar', box);
    const wrap = api.el('div', '', box);
    wrap.style.cssText = 'flex:1;min-height:200px;position:relative;border-radius:14px;overflow:hidden;background:#fff;touch-action:none';
    const cv = api.el('canvas', '', wrap);
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none';
    let color = COLORS[0], size = SIZES[1], eraser = false, history = [], ctx, dpr = Math.min(2, window.devicePixelRatio || 1);

    COLORS.forEach((c) => {
      const s = api.el('button', 'swatch', pal);
      s.style.background = c; s.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,.2)';
      api.on(s, 'click', () => { color = c; eraser = false; mark(); });
    });
    const sizeBtn = api.el('button', 'btn ghost', tools, '');
    const eraserBtn = api.el('button', 'btn ghost', tools, '🧽 Ластик');
    const undoBtn = api.el('button', 'btn ghost', tools, '↶');
    const clearBtn = api.el('button', 'btn ghost', tools, '🗑');
    function mark() {
      [...pal.children].forEach((s, i) => s.classList.toggle('on', !eraser && COLORS[i] === color));
      eraserBtn.className = 'btn ' + (eraser ? '' : 'ghost');
      sizeBtn.textContent = `● ${size}px`;
    }
    api.on(sizeBtn, 'click', () => { size = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length]; mark(); });
    api.on(eraserBtn, 'click', () => { eraser = !eraser; mark(); });
    api.on(undoBtn, 'click', () => { if (history.length) ctx.putImageData(history.pop(), 0, 0); });
    api.on(clearBtn, 'click', () => { snapshot(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); });

    // Холст подстраивается под реальный размер области: Telegram разворачивает окно уже после открытия,
    // и без этого всё, что нарисовано в нижней/правой части, оказывалось за пределами картинки.
    function setup() {
      const r = wrap.getBoundingClientRect();
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (!w || !h || (ctx && w === cv.width && h === cv.height)) return;
      const old = ctx ? ctx.getImageData(0, 0, cv.width, cv.height) : null;
      cv.width = w; cv.height = h;
      ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      if (old) ctx.putImageData(old, 0, 0); // уже нарисованное сохраняем
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      history = [];
    }
    function snapshot() {
      history.push(ctx.getImageData(0, 0, cv.width, cv.height));
      if (history.length > 25) history.shift();
    }
    // координаты касания → пиксели холста с учётом реального масштаба (а не только DPR)
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (cv.width / r.width), (e.clientY - r.top) * (cv.height / r.height)]; };
    let last = null, mid = null;
    api.on(cv, 'pointerdown', (e) => {
      setup(); // на случай, если размер области изменился
      snapshot();
      last = pt(e); mid = last;
      ctx.strokeStyle = eraser ? '#fff' : color; ctx.lineWidth = size * (cv.width / cv.getBoundingClientRect().width);
      ctx.beginPath(); ctx.arc(last[0], last[1], ctx.lineWidth / 2, 0, 7); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
      cv.setPointerCapture(e.pointerId);
    });
    api.on(cv, 'pointermove', (e) => {
      if (!last) return;
      const p = pt(e), m = [(last[0] + p[0]) / 2, (last[1] + p[1]) / 2];
      ctx.beginPath(); ctx.moveTo(mid[0], mid[1]); ctx.quadraticCurveTo(last[0], last[1], m[0], m[1]); ctx.stroke(); // сглаженная линия
      last = p; mid = m;
    });
    api.on(window, 'pointerup', () => { last = null; });

    api.shareBar(box, { image: () => cv.toDataURL('image/png'), filename: 'risunok.png' });
    setup(); mark(); // сразу, не дожидаясь кадра анимации
    requestAnimationFrame(setup);
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => setup()); ro.observe(wrap); api.onDispose(() => ro.disconnect()); }
    api.on(window, 'resize', setup);
  },
});
