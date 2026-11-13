// Двоичное дерево поиска: вставка и поиск
Arcade.register(Algo.viz({
  about: 'В каждом узле: слева — всё меньше, справа — всё больше. Вставка и поиск идут от корня вниз, каждый раз выбирая сторону. Высота дерева = число шагов.',
  complexity: 'O(h): O(log n) в сбалансированном дереве, O(n) в вырожденном (если вставлять по возрастанию)',
  code: ['insert(x): cur = root', '  while cur:', '    if x < cur.key: идём влево', '    else: идём вправо', '  ставим x на пустое место', 'search(x): так же сравниваем от корня'],
  make(api) {
    const keys = []; while (keys.length < 10) { const v = api.randi(90) + 10; if (!keys.includes(v)) keys.push(v); }
    return { keys, find: api.pick(keys) };
  },
  run({ keys, find }) {
    const nodes = [], F = [];
    let root = null;
    const p = (l, t, hi = {}) => F.push({ s: { nodes: nodes.map((n) => ({ ...n })), root, hi }, l, t });
    for (const x of keys) {
      if (root == null) { nodes.push({ key: x, left: null, right: null }); root = 0; p(4, `${x} — корень`, { 0: 'good' }); continue; }
      let cur = root;
      for (;;) {
        p(1, `Вставляем ${x}: сравниваем с ${nodes[cur].key}`, { [cur]: 'warn' });
        const side = x < nodes[cur].key ? 'left' : 'right';
        if (nodes[cur][side] == null) { nodes.push({ key: x, left: null, right: null }); nodes[cur][side] = nodes.length - 1; p(4, `${x} ${side === 'left' ? '<' : '>'} ${nodes[cur].key} — ставим ${side === 'left' ? 'слева' : 'справа'}`, { [nodes.length - 1]: 'good' }); break; }
        cur = nodes[cur][side];
      }
    }
    let cur = root, steps = 0;
    while (cur != null) {
      steps++;
      if (nodes[cur].key === find) { p(5, `Поиск ${find}: найден за ${steps} сравнений`, { [cur]: 'good' }); break; }
      p(5, `Поиск ${find}: ${find} ${find < nodes[cur].key ? '<' : '>'} ${nodes[cur].key}`, { [cur]: 'warn' });
      cur = find < nodes[cur].key ? nodes[cur].left : nodes[cur].right;
    }
    return F;
  },
  draw: (ctx, W, H, f, C) => Algo.tree(ctx, W, H, f, C),
}));
