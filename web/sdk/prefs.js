/* Личные настройки на клиенте: читаются из localStorage (синхронизирует хаб с сервером) и применяются сразу при загрузке.
 * Подключается первым — до arcade.js / hub.js. */
window.ArcadePrefs = (() => {
  'use strict';
  const KEY = 'arcade:prefs';
  const DEF = { lang: 'auto', sound: true, haptics: true, theme: 'tg', text: 'normal', motion: true, open_mode: 'menu', tips: true, daily_size: 3, learn_batch: 20, algo_speed: 1, hide_name: false, breaks: true };
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

/* Язык интерфейса: ?lang= → настройка «Язык» → язык Telegram → язык браузера. L('по-русски', 'in English') — строка на текущем языке. */
(() => {
  const RU_LIKE = ['ru', 'uk', 'be', 'kk', 'ky', 'uz', 'tg', 'tk', 'hy', 'az', 'ka'];
  const q = new URLSearchParams(location.search).get('lang');
  const pref = window.ArcadePrefs.get('lang');
  const tg = window.Telegram && window.Telegram.WebApp;
  const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  const code = String((user && user.language_code) || navigator.language || 'ru').slice(0, 2).toLowerCase();
  window.LANG = q === 'ru' || q === 'en' ? q : pref === 'ru' || pref === 'en' ? pref : RU_LIKE.includes(code) ? 'ru' : 'en';
  window.L = (ru, en) => (window.LANG === 'en' && en != null ? en : ru);
  /** Каталог на текущем языке: title/desc ← title_en/desc_en. */
  window.localize = (o) => {
    if (o && window.LANG === 'en') { if (o.title_en) o.title = o.title_en; if (o.desc_en) o.desc = o.desc_en; if (o.unit_en) o.unit = o.unit_en; }
    return o;
  };
  document.documentElement.lang = window.LANG;
})();
