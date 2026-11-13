Arcade.register({
  howto: 'Круг сжимается к кольцу — тапни в момент совпадения. Идеально +3, хорошо +1, мимо — минус жизнь (их 3).',
  start(api) {
    const g = api.canvas(), x = g.ctx, C = api.colors;
    let t = 0, active = true, lives = 3, msg = null, beats = 0;
    const period = () => Math.max(0.65, 1.5 - beats * 0.03);

    function judge(text, color, pts) {
      msg = { text, color, a: 1 };
      if (pts) { api.addScore(pts); api.haptic(pts > 1 ? 'success' : 'light'); api.tone(pts > 1 ? 990 : 660, 70); }
      else { api.haptic('error'); if (--lives <= 0) return api.end(); }
      active = false; beats++;
      api.after(250, () => { t = 0; active = true; });
    }

    api.onAction(() => {
      if (!active) return;
      const p = t / period();
      const diff = Math.abs(1 - p);
      if (diff < 0.06) judge('Идеально!', C.good, 3);
      else if (diff < 0.16) judge('Хорошо', C.accent, 1);
      else judge('Мимо', C.bad, 0);
    });

    api.loop((dt) => {
      const cx = g.W / 2, cy = g.H / 2, T = Math.min(g.W, g.H) * 0.13, Rs = Math.min(g.W, g.H) * 0.45;
      if (active) {
        t += dt;
        if (t / period() > 1.2) { judge('Поздно', C.bad, 0); if (api.ended) return; }
      }
      x.fillStyle = C.bg; x.fillRect(0, 0, g.W, g.H);
      x.strokeStyle = C.fg; x.lineWidth = 6;
      x.beginPath(); x.arc(cx, cy, T, 0, 7); x.stroke();
      if (active) {
        const r = Math.max(2, Rs - (Rs - T) * (t / period()));
        x.strokeStyle = C.accent; x.lineWidth = 4;
        x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke();
      }
      if (msg) {
        msg.a -= dt * 1.6;
        x.globalAlpha = Math.max(0, msg.a); x.fillStyle = msg.color;
        x.font = '700 28px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(msg.text, cx, cy + T + 60);
        x.globalAlpha = 1;
      }
      x.font = '16px system-ui'; x.textAlign = 'left'; x.textBaseline = 'top';
      x.fillText('❤️'.repeat(Math.max(0, lives)), 10, 8);
    });
  },
});
