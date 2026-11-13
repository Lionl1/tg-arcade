// Хеш-таблица с цепочками
Arcade.register(Algo.viz({
  about: 'Хеш-функция превращает ключ в номер корзины. Поиск сразу идёт в нужную корзину, поэтому в среднем O(1). Если ключи попали в одну корзину — коллизия, их храним цепочкой.',
  complexity: 'вставка и поиск — O(1) в среднем, O(n) в худшем (всё в одной корзине)',
  code: ['h(key) = (сумма кодов букв) mod M', 'insert(key): bucket = h(key)', '  добавить key в цепочку bucket', 'find(key): искать только в цепочке h(key)'],
  make(api) {
    const WORDS = ['кот', 'дом', 'сок', 'лес', 'мир', 'нос', 'сыр', 'чай', 'мак', 'лук', 'рак', 'ёж', 'кит', 'жук', 'пёс', 'бок'];
    return api.shuffle(WORDS).slice(0, 10);
  },
  run(keys) {
    const M = 7, table = [...Array(M)].map(() => []), F = [];
    const h = (s) => [...s].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % M;
    const p = (l, t, b, word) => F.push({ s: { table: table.map((c) => c.slice()), b, word }, l, t });
    p(0, `Таблица из ${M} корзин`);
    for (const k of keys) {
      const sum = [...k].reduce((acc, ch) => acc + ch.charCodeAt(0), 0), b = h(k);
      p(0, `h("${k}") = ${sum} mod ${M} = ${b}`, b, k);
      const coll = table[b].length > 0;
      table[b].push(k);
      p(2, coll ? `Коллизия! В корзине ${b} уже есть ${table[b].slice(0, -1).join(', ')} — добавляем в цепочку` : `Кладём "${k}" в корзину ${b}`, b, k);
    }
    const q = keys[3];
    p(3, `Поиск "${q}": сразу смотрим в корзину ${h(q)}`, h(q), q);
    return F;
  },
  draw(ctx, W, H, f, C) {
    const { table, b, word } = f.s, M = table.length, rh = Math.min(34, (H - 16) / M);
    ctx.font = '600 13px system-ui'; ctx.textBaseline = 'middle';
    table.forEach((chain, i) => {
      const y = 8 + i * rh;
      ctx.fillStyle = i === b ? C.warn : C.accent; ctx.fillRect(8, y + 2, 34, rh - 4);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(i, 25, y + rh / 2);
      chain.forEach((k, j) => {
        const x = 56 + j * 64;
        ctx.strokeStyle = C.hint; ctx.beginPath(); ctx.moveTo(x - 14, y + rh / 2); ctx.lineTo(x, y + rh / 2); ctx.stroke();
        ctx.fillStyle = k === word ? C.good : 'rgba(127,127,127,.25)'; ctx.fillRect(x, y + 3, 54, rh - 6);
        ctx.fillStyle = C.fg; ctx.fillText(k, x + 27, y + rh / 2);
      });
    });
    ctx.textBaseline = 'alphabetic';
  },
}));
