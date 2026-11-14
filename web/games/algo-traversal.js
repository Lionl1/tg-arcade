// Обходы двоичного дерева: прямой, симметричный, обратный
Arcade.register(Algo.viz({
  about: 'Три способа обойти дерево рекурсией. Симметричный (in-order) в дереве поиска выдаёт ключи по возрастанию; прямой (pre-order) удобен для копирования дерева; обратный (post-order) — для удаления.',
  complexity: 'O(n) — каждый узел посещается один раз',
  code: ['pre-order(node):  посетить node → левое → правое', 'in-order(node):   левое → посетить node → правое', 'post-order(node): левое → правое → посетить node'],
  make(api) {
    const keys = []; while (keys.length < 8) { const v = api.randi(90) + 10; if (!keys.includes(v)) keys.push(v); }
    return keys;
  },
  run(keys) {
    const nodes = []; let root = null;
    for (const k of keys) { // строим дерево поиска
      if (root == null) { nodes.push({ key: k, left: null, right: null }); root = 0; continue; }
      let c = root;
      for (;;) { const side = k < nodes[c].key ? 'left' : 'right'; if (nodes[c][side] == null) { nodes.push({ key: k, left: null, right: null }); nodes[c][side] = nodes.length - 1; break; } c = nodes[c][side]; }
    }
    const F = [];
    const orders = [['pre', 0, 'Прямой (pre-order)'], ['in', 1, 'Симметричный (in-order) — по возрастанию!'], ['post', 2, 'Обратный (post-order)']];
    for (const [kind, line, title] of orders) {
      const out = [];
      const visit = (i) => {
        if (i == null) return;
        if (kind === 'pre') { out.push(nodes[i].key); F.push({ s: { nodes, root, hi: { [i]: 'warn' }, out: out.slice(), title }, l: line, t: `${title}: ${out.join(' → ')}` }); }
        visit(nodes[i].left);
        if (kind === 'in') { out.push(nodes[i].key); F.push({ s: { nodes, root, hi: { [i]: 'warn' }, out: out.slice(), title }, l: line, t: `${title}: ${out.join(' → ')}` }); }
        visit(nodes[i].right);
        if (kind === 'post') { out.push(nodes[i].key); F.push({ s: { nodes, root, hi: { [i]: 'warn' }, out: out.slice(), title }, l: line, t: `${title}: ${out.join(' → ')}` }); }
      };
      visit(root);
    }
    return F;
  },
  draw(ctx, W, H, f, C) {
    Algo.tree(ctx, W, H, f, C, 8, H - 50);
    ctx.fillStyle = C.fg; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(f.s.out.join('  '), W / 2, H - 14);
  },
}));
