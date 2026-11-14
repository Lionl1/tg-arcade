// Обходы двоичного дерева: прямой, симметричный, обратный
Arcade.register(Algo.viz({
  about: L('Три способа обойти дерево рекурсией. Симметричный (in-order) в дереве поиска выдаёт ключи по возрастанию; прямой (pre-order) удобен для копирования дерева; обратный (post-order) — для удаления.', 'Three ways to walk a tree recursively. In-order on a search tree yields the keys in ascending order; pre-order is handy for copying a tree; post-order for deleting it.'),
  complexity: L('O(n) — каждый узел посещается один раз', 'O(n) — every node is visited once'),
  code: L(['pre-order(node):  посетить node → левое → правое', 'in-order(node):   левое → посетить node → правое', 'post-order(node): левое → правое → посетить node'], ['pre-order(node):  visit node → left → right', 'in-order(node):   left → visit node → right', 'post-order(node): left → right → visit node']),
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
    const orders = [['pre', 0, L('Прямой (pre-order)', 'Pre-order')], ['in', 1, L('Симметричный (in-order) — по возрастанию!', 'In-order — ascending!')], ['post', 2, L('Обратный (post-order)', 'Post-order')]];
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
