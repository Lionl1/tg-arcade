// Мемы: фото или шаблон + подпись сверху и снизу → картинка для чата
Arcade.register({
  app: true,
  start(api) {
    const TEMPLATES = [['🐸', '#3fb950'], ['😹', '#e3b341'], ['🤔', '#4a90e2'], ['🔥', '#e5534b'], ['😎', '#a371f7'], ['🐶', '#f0883e'], ['💀', '#30363d'], ['🥲', '#39c5cf']];
    const box = api.el('div', 'appbox');
    const top = api.el('input', '', box); top.type = 'text'; top.placeholder = 'Текст сверху'; top.maxLength = 80;
    const bottom = api.el('input', '', box); bottom.type = 'text'; bottom.placeholder = 'Текст снизу'; bottom.maxLength = 80;
    const tpl = api.el('div', 'toolbar', box);
    const cv = api.el('canvas', '', box);
    cv.width = cv.height = 720;
    cv.style.cssText = 'width:min(100%,52vh);aspect-ratio:1;align-self:center;border-radius:14px';
    const ctx = cv.getContext('2d');
    let bg = TEMPLATES[0], photo = null;

    TEMPLATES.forEach((t) => {
      const b = api.el('button', 'swatch', tpl, t[0]);
      b.style.cssText = `width:40px;height:40px;font-size:22px;background:${t[1]};border-radius:10px`;
      api.on(b, 'click', () => { bg = t; photo = null; draw(); });
    });
    const file = api.el('input', '', tpl); file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    const pick = api.el('button', 'btn ghost', tpl, '🖼 Своё фото');
    api.on(pick, 'click', () => file.click());
    api.on(file, 'change', () => {
      const f = file.files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => { photo = img; draw(); };
      img.src = URL.createObjectURL(f);
    });

    function lines(text, max) {
      const words = text.toUpperCase().split(/\s+/).filter(Boolean), out = [];
      let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; }
      if (cur) out.push(cur);
      return out;
    }
    function caption(text, atTop) {
      if (!text.trim()) return;
      let fs = 76;
      do { ctx.font = `900 ${fs}px Impact, "Arial Black", system-ui`; fs -= 4; } while (lines(text, 680).length > 3 && fs > 30);
      const ls = lines(text, 680), lh = fs * 1.1;
      ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = fs / 7; ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
      ls.forEach((l, i) => {
        const y = atTop ? 20 + lh * (i + 1) - lh * 0.15 : 720 - 24 - lh * (ls.length - 1 - i);
        ctx.strokeText(l, 360, y); ctx.fillText(l, 360, y);
      });
    }
    function draw() {
      if (photo) { // обрезаем фото по центру в квадрат
        const s = Math.min(photo.width, photo.height);
        ctx.drawImage(photo, (photo.width - s) / 2, (photo.height - s) / 2, s, s, 0, 0, 720, 720);
      } else {
        ctx.fillStyle = bg[1]; ctx.fillRect(0, 0, 720, 720);
        ctx.font = '360px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bg[0], 360, 380);
        ctx.textBaseline = 'alphabetic';
      }
      caption(top.value, true);
      caption(bottom.value, false);
    }
    api.on(top, 'input', draw);
    api.on(bottom, 'input', draw);
    api.shareBar(box, { image: () => cv.toDataURL('image/png'), filename: 'mem.png' });
    draw();
  },
});
