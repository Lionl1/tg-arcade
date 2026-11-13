/* Личные настройки на клиенте: читаются из localStorage (синхронизирует хаб с сервером) и применяются сразу при загрузке.
 * Подключается первым — до arcade.js / hub.js. */
window.ArcadePrefs = (() => {
  'use strict';
  const KEY = 'arcade:prefs';
  const DEF = { sound: true, haptics: true, theme: 'tg', text: 'normal', motion: true, open_mode: 'menu', tips: true, daily_size: 3, learn_batch: 20, algo_speed: 1, hide_name: false };
  let p = { ...DEF };
  try { Object.assign(p, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* приватный режим и т. п. */ }

  const THEMES = {
    dark: { bg: '#17212b', card: '#232e3c', fg: '#f5f5f5', hint: '#8a9aa9', accent: '#5288c1', 'accent-fg': '#ffffff' },
    light: { bg: '#ffffff', card: '#f1f3f5', fg: '#1b1f23', hint: '#6b7785', accent: '#3a7bd5', 'accent-fg': '#ffffff' },
  };
  function apply() {
    const root = document.documentElement;
    if (THEMES[p.theme]) for (const [k, v] of Object.entries(THEMES[p.theme])) root.style.setProperty('--' + k, v);
    root.classList.toggle('large', p.text === 'large');
    root.classList.toggle('nomotion', !p.motion);
    root.classList.toggle('notips', !p.tips);
  }
  function save(next) {
    p = { ...p, ...next };
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* noop */ }
    apply();
    return p;
  }
  return { get: (k) => p[k], all: () => ({ ...p }), save, apply, DEF };
})();
