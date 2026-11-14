// Двоичное дерево поиска: вставка и поиск
Arcade.register(Algo.viz({
  about: L('В каждом узле: слева — всё меньше, справа — всё больше. Вставка и поиск идут от корня вниз, каждый раз выбирая сторону. Высота дерева = число шагов.', 'At every node: everything on the left is smaller, everything on the right is larger. Insert and search go down from the root, picking a side each time. Tree height = number of steps.'),
  complexity: L('O(h): O(log n) в сбалансированном дереве, O(n) в вырожденном (если вставлять по возрастанию)', 'O(h): O(log n) in a balanced tree, O(n) in a degenerate one (if you insert in ascending order)'),
  code: ['insert(x): cur = root', '  while cur:', L('    if x < cur.key: идём влево', '    if x < cur.key: go left'), L('    else: идём вправо', '    else: go right'), L('  ставим x на пустое место', '  put x into the empty spot'), L('search(x): так же сравниваем от корня', 'search(x): compare from the root the same way')],
  make(api) {
    const keys = []; while (keys.length < 10) { const v = api.randi(90) + 10; if (!keys.includes(v)) keys.push(v); }
    return { keys, find: api.pick(keys) };
  },
  run({ keys, find }) {
    const nodes = [], F = [];
    let root = null;
    const p = (l, t, hi = {}) => F.push({ s: { nodes: nodes.map((n) => ({ ...n })), root, hi }, l, t });
    for (const x of keys) {
      if (root == null) { nodes.push({ key: x, left: null, right: null }); root = 0; p(4, L(`${x} — корень`, `${x} is the root`), { 0: 'good' }); continue; }
      let cur = root;
      for (;;) {
        p(1, L(`Вставляем ${x}: сравниваем с ${nodes[cur].key}`, `Insert ${x}: compare with ${nodes[cur].key}`), { [cur]: 'warn' });
        const side = x < nodes[cur].key ? 'left' : 'right';
        if (nodes[cur][side] == null) { nodes.push({ key: x, left: null, right: null }); nodes[cur][side] = nodes.length - 1; p(4, L(`${x} ${side === 'left' ? '<' : '>'} ${nodes[cur].key} — ставим ${side === 'left' ? 'слева' : 'справа'}`, `${x} ${side === 'left' ? '<' : '>'} ${nodes[cur].key} — goes to the ${side === 'left' ? 'left' : 'right'}`), { [nodes.length - 1]: 'good' }); break; }
        cur = nodes[cur][side];
      }
    }
    let cur = root, steps = 0;
    while (cur != null) {
      steps++;
      if (nodes[cur].key === find) { p(5, L(`Поиск ${find}: найден за ${steps} сравнений`, `Search ${find}: found in ${steps} comparisons`), { [cur]: 'good' }); break; }
      p(5, L(`Поиск ${find}: ${find} ${find < nodes[cur].key ? '<' : '>'} ${nodes[cur].key}`, `Search ${find}: ${find} ${find < nodes[cur].key ? '<' : '>'} ${nodes[cur].key}`), { [cur]: 'warn' });
      cur = find < nodes[cur].key ? nodes[cur].left : nodes[cur].right;
    }
    return F;
  },
  draw: (ctx, W, H, f, C) => Algo.tree(ctx, W, H, f, C),
}));
