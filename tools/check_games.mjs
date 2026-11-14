// Автопроверка контента: колоды, генераторы заданий, шахматные задачи, каталог.
//   node tools/check_games.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WEB = path.join(ROOT, 'web');
const cat = JSON.parse(fs.readFileSync(path.join(WEB, 'games/catalog.json'), 'utf8'));
const problems = [];
const bad = (id, msg) => problems.push(`${id}: ${msg}`);

// --- песочница браузера: window, Arcade.register, fetch с диска; язык интерфейса — ru или en ---
const CYR = /[А-Яа-яЁё]/;
const RU_CONTENT = new Set(['english', 'english-b', 'phrases']); // учим русский: русские слова в карточках — это и есть контент
async function loadAll(lang) {
  const registered = {};
  let current = null;
  const sandbox = {
    console, setTimeout, Promise, Math, JSON, String, Number, Array, Object, Set, Map, RegExp, Intl,
    document: { createElement: () => ({ style: {}, appendChild() {} }), head: { appendChild() {} }, body: { appendChild() {} } },
    fetch: async (url) => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(WEB, url), 'utf8')) }),
    LANG: lang,
  };
  sandbox.window = sandbox;
  sandbox.L = (ru, en) => (lang === 'en' && en != null ? en : ru);
  sandbox.Arcade = { register: (def) => { registered[current] = def; }, fail: (msg) => bad(current, `[${lang}] не загрузилась: ` + msg) };
  vm.createContext(sandbox);
  for (const f of ['sdk/countries.js', 'sdk/learn.js', 'sdk/algo-code.js', 'sdk/algo.js', 'sdk/algo-paths.js', 'sdk/fit.js']) vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8'), sandbox);
  for (const g of cat.games) {
    current = g.id;
    if (g.id === 'chess' || (g.lang && g.lang !== lang)) continue; // шахматы — отдельно; игры на другом языке не показываются
    try { vm.runInContext(fs.readFileSync(path.join(WEB, 'games', g.id + '.js'), 'utf8'), sandbox); } catch (e) { bad(g.id, `[${lang}] ошибка загрузки: ` + e.message); }
    await new Promise((r) => setTimeout(r, 5)); // асинхронные колоды (Learn.load) регистрируются после загрузки данных
  }
  return { registered, sandbox };
}

const api = (score = 0, level = 0) => ({
  score, level, mode: 'free',
  rand: (lo = 0, hi = 1) => lo + Math.random() * (hi - lo), randi: (n) => Math.floor(Math.random() * n),
  pick: (a) => a[Math.floor(Math.random() * a.length)],
  shuffle: (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; },
});

let decks = 0, gens = 0, checks = 0;
const LOADED = {};
for (const lang of ['ru', 'en']) {
  const { registered, sandbox } = await loadAll(lang);
  LOADED[lang] = { registered, sandbox };
  const id = (g) => `${g.id} [${lang}]`;
  // в английском интерфейсе не должно остаться русского текста (кроме колод, где русский — предмет изучения)
  const leak = (g, where, text) => { if (lang === 'en' && !RU_CONTENT.has(g.id) && CYR.test(String(text))) { bad(id(g), `русский текст в английском интерфейсе (${where}): ${String(text).slice(0, 80)}`); return true; } return false; };
  for (const g of cat.games) {
    if (g.lang && g.lang !== lang) continue;
    if (lang === 'en' && (!g.title_en || !g.desc_en) && !g.lang) bad(id(g), 'нет title_en / desc_en в каталоге');
    const def = registered[g.id];
    if (!def) { if (g.id !== 'chess') bad(id(g), 'не вызвал Arcade.register'); continue; }
    if (def.howto && leak(g, 'howto', def.howto)) continue;
    if (!def.cfg) continue;
    const cfg = def.cfg;
    if (['ask', 'askRev', 'rule'].some((k) => cfg[k] && leak(g, k, cfg[k]))) continue;
    if (cfg.gen) { // генератор: 4000 заданий на разных уровнях счёта
      gens++;
      for (let i = 0; i < 4000; i++) {
        const c = cfg.gen(api(i % 40, i % 25));
        checks++;
        const a = String(c.a), wrong = [...new Set((c.wrong || []).map(String))].filter((w) => w !== a);
        if (!c.q || a === '' || /NaN|undefined|Infinity|null/.test(a + c.q)) { bad(id(g), `битое задание: ${JSON.stringify(c)}`); break; }
        if (!wrong.length) { bad(id(g), `нет неверных вариантов: ${c.q} → ${a}`); break; }
        if (wrong.some((w) => /NaN|undefined|Infinity/.test(w))) { bad(id(g), `битый вариант: ${JSON.stringify(c)}`); break; }
        if (leak(g, 'задание', c.q + ' ' + a + ' ' + wrong.join(' ') + ' ' + (c.ask || ''))) break;
      }
      continue;
    }
    decks++;
    const all = sandbox.Learn._normalize(cfg.cards, cfg.both);
    const byQ = new Map();
    let leaked = false;
    for (const c of all) {
      if (!c.q || !c.a) bad(id(g), `пустая карточка ${JSON.stringify(c)}`);
      if (!c.pool && byQ.has(c.q) && byQ.get(c.q) !== c.a) bad(id(g), `неоднозначно: «${c.q}» → «${byQ.get(c.q)}» и «${c.a}»`);
      byQ.set(c.q, c.a);
      if (!leaked) leaked = leak(g, 'карточка', `${c.q} ${c.a} ${(c.wrong || []).join(' ')}`);
    }
    for (let i = 0; i < 3000; i++) { // варианты ответа: правильный есть, все разные, хотя бы 2
      const c = all[i % all.length];
      const o = sandbox.Learn._options(c, all, api());
      checks++;
      if (!o.includes(c.a) || new Set(o).size !== o.length || o.length < 2) { bad(id(g), `плохие варианты для «${c.q}»: ${o.join(' | ')}`); break; }
      // в вариантах не должно быть второго верного ответа (для колод с одинаковым вопросом)
      const alt = all.filter((x) => x.q === c.q && x.a !== c.a && !c.pool).map((x) => x.a);
      if (o.some((v) => alt.includes(v))) { bad(id(g), `два верных варианта для «${c.q}»`); break; }
    }
  }
}
const { registered, sandbox } = LOADED.ru;

// --- тренировки: в каждом дне программы (1–40) есть упражнения, все они есть в наборе, числа разумные ---
{
  const ex = JSON.parse(fs.readFileSync(path.join(WEB, 'games/data/fit.json'), 'utf8')).exercises;
  for (const g of cat.games.filter((x) => x.section === 'fit')) {
    const def = registered[g.id];
    if (!def || !def.fit) { bad(g.id, 'тренировка не собрана через Fit.workout'); continue; }
    for (let lv = 1; lv <= 40; lv++) {
      const plan = def.fit.plan(lv);
      if (!plan.length) { bad(g.id, `день ${lv}: пустой план`); break; }
      const wrong = plan.find((s) => !ex[s.ex] || !(s.reps > 0 || s.sec > 0) || s.reps > 60 || s.sec > 180 || (s.rest || 0) > 180);
      if (wrong) { bad(g.id, `день ${lv}: плохой шаг ${JSON.stringify(wrong)}`); break; }
    }
  }
}

// --- пути и опоры: каждый шаг — существующая игра нужного языка, у каждого раздела есть опора ---
for (const sec of cat.sections) if (!(cat.pillars || []).some((p) => p.id === sec.pillar)) bad(sec.id, 'у раздела нет опоры (pillar)');
for (const p of cat.paths || []) {
  for (const lang of ['ru', 'en']) {
    const steps = p.steps.map((st) => (lang === 'en' && st.game_en) || st.game).map((id) => cat.games.find((g) => g.id === id));
    if (steps.some((g) => !g)) bad(`путь ${p.id}`, 'шаг ссылается на несуществующую игру');
    const vis = steps.filter((g) => g && (!g.lang || g.lang === lang) && !g.app);
    if (vis.length < 6) bad(`путь ${p.id} [${lang}]`, `слишком мало доступных шагов: ${vis.length}`);
  }
  if (!p.title_en || !p.desc_en) bad(`путь ${p.id}`, 'нет английского названия/описания');
}

// --- L() — функция перевода: локальная переменная с именем L ломает строки игры в обоих языках ---
for (const g of cat.games) {
  const src = fs.readFileSync(path.join(WEB, 'games', g.id + '.js'), 'utf8');
  if (/(?:const|let|var)\s*(?:\[\s*)?L\b|function\s*\w*\s*\(\s*L\b/.test(src)) bad(g.id, 'локальная переменная L перекрывает функцию перевода L()');
}

// --- ударения: в каждом слове ровно одна заглавная гласная ---
const stress = fs.readFileSync(path.join(WEB, 'games/ege-stress.js'), 'utf8').match(/`([^`]+)`/)[1].split(/\s+/).filter(Boolean);
for (const w of stress) if ((w.match(/[АЕЁИОУЫЭЮЯ]/g) || []).length !== 1) bad('ege-stress', `слово «${w}»: должна быть ровно одна ударная (заглавная) гласная`);
if (new Set(stress).size !== stress.length) bad('ege-stress', 'есть повторы слов');

// --- шахматы: каждая задача из базы Lichess проигрывается допустимыми ходами ---
const chessSrc = fs.readFileSync(path.join(WEB, 'vendor/chess.js'), 'utf8');
const cm = { exports: {} };
new Function('module', 'exports', 'define', chessSrc)(cm, cm.exports, undefined);
const Chess = cm.exports.Chess || cm.exports;
const puzzles = JSON.parse(fs.readFileSync(path.join(WEB, 'games/data/chess.json'), 'utf8')).puzzles;
let chessOk = 0;
for (const [id, fen, moves] of puzzles) {
  const game = new Chess(fen);
  const ok = moves.split(' ').every((u) => game.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' }));
  if (ok) chessOk++; else bad('chess', `задача ${id}: недопустимый ход в решении`);
}

// --- учебный код: всё реально исполняется в Python (и JS) ---
// Python-раннер: получает JSON [{code, test?, expect?, mustFail?}], возвращает [{ok, out, err}]
const RUNNER = `
import json, sys, io, contextlib
res = []
for job in json.load(sys.stdin):
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(job["code"] + "\\n" + job.get("test", ""), {})
        res.append({"ok": True, "out": buf.getvalue().strip()})
    except BaseException as e:
        res.append({"ok": False, "out": buf.getvalue().strip(), "err": type(e).__name__ + ": " + str(e)[:120]})
print(json.dumps(res))
`;
const runPy = (jobs) => JSON.parse(execFileSync('python3', ['-I', '-c', RUNNER], { input: JSON.stringify(jobs), encoding: 'utf8', maxBuffer: 64 << 20 }));
let pyRuns = 0;

// 1) настоящий код алгоритмов: Python и JavaScript с тестами
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const algoIds = Object.keys(sandbox.ALGO_CODE || {});
runPy(algoIds.map((id) => ({ code: sandbox.ALGO_CODE[id].py, test: sandbox.ALGO_CODE[id].pyTest }))).forEach((r, k) => {
  pyRuns++;
  if (!r.ok) bad(algoIds[k], 'Python-код не проходит тест: ' + r.err);
});
for (const id of algoIds) {
  const c = sandbox.ALGO_CODE[id];
  try { if (new Function('eq', c.js + '\nreturn (' + c.jsTest + ');')(eq) !== true) bad(id, 'JS-код не проходит тест'); } catch (e) { bad(id, 'JS-код падает: ' + e.message); }
}
for (const g of cat.games) if (g.section === 'algo' && (registered[g.id] || {}).viz && !sandbox.ALGO_CODE[g.id]) bad(g.id, 'нет настоящего кода (ALGO_CODE)');

// 2) «Собери код»: эталон каждой задачи проходит свой тест
for (const lang of ['ru', 'en']) {
  const parsons = (LOADED[lang].registered.parsons || {}).bank || [];
  runPy(parsons.map((t) => ({ code: t.code, test: t.test }))).forEach((r, k) => { pyRuns++; if (!r.ok) bad(`parsons [${lang}]`, `«${parsons[k].task}»: ${r.err}`); });
}

// 3) «Найди ошибку»: с исправлением тест проходит, с багом — НЕ проходит (иначе это не баг)
for (const lang of ['ru', 'en']) {
  const bugs = (LOADED[lang].registered.findbug || {}).bank || [];
  const fixedJobs = bugs.map((b) => ({ code: b.code.map((l, i) => (i === b.bug ? b.fix : l)).join('\n'), test: b.test }));
  const buggyJobs = bugs.map((b) => ({ code: b.code.join('\n'), test: b.test }));
  runPy(fixedJobs).forEach((r, k) => { pyRuns++; if (!r.ok) bad(`findbug [${lang}]`, `«${bugs[k].task}»: исправленная версия не проходит тест — ${r.err}`); });
  runPy(buggyJobs).forEach((r, k) => { pyRuns++; if (r.ok) bad(`findbug [${lang}]`, `«${bugs[k].task}»: версия с багом проходит тест — это не баг`); });
}

// 4) «Что выведет код?»: ответ генератора = реальный вывод Python
const trace = registered.trace && registered.trace.cfg;
if (trace) {
  const cases = [...Array(400)].map((_, i) => trace.gen(api(i % 30, i % 12)));
  runPy(cases.map((c) => ({ code: c.q }))).forEach((r, k) => {
    pyRuns++;
    if (!r.ok) bad('trace', `код падает: ${cases[k].q.split('\n')[0]}… — ${r.err}`);
    else if (r.out !== String(cases[k].a)) bad('trace', `ответ «${cases[k].a}», а Python печатает «${r.out}» для: ${cases[k].q.replace(/\n/g, ' ⏎ ')}`);
  });
}

// --- каталог ---
const ids = new Set();
for (const g of cat.games) {
  if (ids.has(g.id)) bad(g.id, 'дубль id');
  ids.add(g.id);
  if (!fs.existsSync(path.join(WEB, 'games', g.id + '.js'))) bad(g.id, 'нет файла игры');
  if (!g.app && !(g.par > 0)) bad(g.id, 'нет нормы par');
}

console.log(`Колод: ${decks}, генераторов: ${gens}, проверок вариантов: ${checks}, шахматных задач: ${chessOk}/${puzzles.length}, слов с ударением: ${stress.length}, запусков Python: ${pyRuns}`);
if (problems.length) { console.log(`\n❌ Проблемы (${problems.length}):\n` + problems.slice(0, 60).join('\n')); process.exit(1); }
console.log('✅ Проблем не найдено');
