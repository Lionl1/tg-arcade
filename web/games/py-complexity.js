// Сложность операций в Python: то, что надо знать, чтобы писать быстрый код
Arcade.register(Learn.deck({
  ask: L('Какая сложность у операции?', 'What is the complexity of the operation?'),
  rule: L('n — размер коллекции. Средний случай для словарей и множеств.', 'n is the collection size. Average case for dicts and sets.'),
  cards: [
    [L('a[i]  (список)', 'a[i]  (list)'), 'O(1)', 1], ['len(a)', 'O(1)', 1], ['a.append(x)', L('O(1) амортизированно', 'O(1) amortised'), 1], ['a.pop()', 'O(1)', 1],
    ['a.pop(0)', 'O(n)', 2], ['a.insert(0, x)', 'O(n)', 2], [L('x in a  (список)', 'x in a  (list)'), 'O(n)', 1], [L('x in s  (множество)', 'x in s  (set)'), L('O(1) в среднем', 'O(1) average'), 1],
    [L('d[key]  (словарь)', 'd[key]  (dict)'), L('O(1) в среднем', 'O(1) average'), 1], ['s.add(x)', L('O(1) в среднем', 'O(1) average'), 1], ['sorted(a) / a.sort()', 'O(n log n)', 2], ['min(a), max(a), sum(a)', 'O(n)', 1],
    [L('a[i:j]  (срез)', 'a[i:j]  (slice)'), 'O(j − i)', 2], ['a.reverse()', 'O(n)', 2], ['deque.popleft()', 'O(1)', 2], ['heapq.heappush(h, x)', 'O(log n)', 2],
    ['heapq.heappop(h)', 'O(log n)', 2], [L('h[0]  (минимум кучи)', 'h[0]  (heap minimum)'), 'O(1)', 2], ['bisect.bisect_left(a, x)', 'O(log n)', 3], ['Counter(a)', 'O(n)', 2],
    [L('s += "x" в цикле n раз', 's += "x" in a loop n times'), 'O(n²)', 3], ['"".join(parts)', 'O(n)', 3], ['a.index(x)', 'O(n)', 2], ['a.count(x)', 'O(n)', 2],
    [L('set(a)  (из списка)', 'set(a)  (from a list)'), 'O(n)', 2], [L('a + b  (сложение списков)', 'a + b  (list concatenation)'), 'O(len(a) + len(b))', 3],
  ].map(([q, a, d]) => ({ q, a, d })),
}));
