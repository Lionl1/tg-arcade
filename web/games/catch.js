Arcade.register({
  howto: L('Двигай корзину пальцем и лови фрукты. Пропустишь 3 фрукта или поймаешь бомбу 💣 — конец.', 'Move the basket with your finger and catch fruit. Miss 3 fruits or catch a bomb 💣 and it is over.'),
  chapters: {
    2: L('золотая звезда ⭐ = +3', 'golden star ⭐ = +3'),
    3: L('сердечко 💖 возвращает жизнь', 'a heart 💖 gives back a life'),
    4: L('фрукты летят зигзагом', 'fruit falls in a zigzag'),
  },
  start(api) {
    const ch = api.chapter;
    const g = api.canvas(), x = g.ctx, C = api.colors, keys = api.keys();
    const FRUITS = ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑'];
    const bw = 70;
    let bx = g.W / 2, target = bx, items = [], spawn = 0.6, lives = 3, t = 0, dead = false;

    const aim = (e) => { target = api.pos(e).x; };
    api.on(api.stage, 'pointerdown', aim);
    api.on(api.stage, 'pointermove', aim);

    function over() { dead = true; api.haptic('heavy'); api.after(500, () => api.end()); }

    api.loop((dt) => {
      const by = g.H - 60;
      if (!dead) {
        t += dt;
        const k = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
        if (k) target = bx + k * 40;
        target = api.clamp(target, bw / 2, g.W - bw / 2);
        bx += (target - bx) * Math.min(1, dt * 14);

        spawn -= dt;
        if (spawn <= 0) {
          const bomb = api.rand() < 0.15 + Math.min(0.15, t / 400);
          const r = api.rand();
          const kind = bomb ? 'bomb' : ch >= 3 && r < 0.04 && lives < 3 ? 'heart' : ch >= 2 && r < 0.12 ? 'star' : 'fruit';
          const e = { bomb: '💣', heart: '💖', star: '⭐', fruit: api.pick(FRUITS) }[kind];
          items.push({ x: api.rand(20, g.W - 20), y: -20, v: api.rand(140, 200) + t * 6, e, bomb, kind,
            zig: ch >= 4 && !bomb && api.rand() < 0.5 ? api.rand(1.5, 3) : 0, ph: api.rand(0, 6), x0: 0 });
          items[items.length - 1].x0 = items[items.length - 1].x;
          spawn = Math.max(0.3, 0.9 - t * 0.01);
        }
        for (const it of items) {
          it.y += it.v * dt;
          if (it.zig) it.x = api.clamp(it.x0 + Math.sin(it.ph + it.y / 60 * it.zig) * 45, 20, g.W - 20);
          if (!it.done && it.y > by - 12 && it.y < by + 20 && Math.abs(it.x - bx) < bw / 2 + 8) {
            it.done = true;
            if (it.bomb) { over(); break; }
            if (it.kind === 'heart') { lives = Math.min(3, lives + 1); api.haptic('success'); api.tone(880, 80); continue; }
            api.addScore(it.kind === 'star' ? 3 : 1); api.haptic('light'); api.tone(it.kind === 'star' ? 990 : 640, 40);
          } else if (!it.done && it.y > g.H + 20) {
            it.done = true;
            if (it.kind !== 'fruit') continue; // пропустить звезду или сердце не страшно
            if (--lives <= 0) { over(); break; }
            api.haptic('error');
          }
        }
        items = items.filter((it) => !it.done);
      }

      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '30px system-ui';
      for (const it of items) x.fillText(it.e, it.x, it.y);
      x.font = '52px system-ui'; x.fillText('🧺', bx, by + 6);
      x.font = '16px system-ui'; x.textAlign = 'left'; x.fillText('❤️'.repeat(Math.max(0, lives)), 10, 20);
    });
  },
});
