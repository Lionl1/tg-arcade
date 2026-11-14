// Пирамидальная сортировка (heap sort)
Arcade.register(Algo.viz({
  about: L('Сначала превращаем массив в max-кучу (родитель ≥ детей), потом раз за разом меняем корень — максимум — с последним элементом и «просеиваем» новый корень вниз.', 'First turn the array into a max-heap (parent ≥ children), then repeatedly swap the root — the maximum — with the last element and “sift” the new root down.'),
  complexity: L('O(n log n) всегда, O(1) доп. памяти; неустойчивая', 'O(n log n) always, O(1) extra memory; not stable'),
  code: L(['build_max_heap(a)          # от середины к началу: sift(i)', 'for end = n-1 .. 1:', '  swap(a[0], a[end])        # максимум — в конец', '  sift(0, end)              # восстановить кучу', 'sift(i): пока ребёнок больше — меняем с бо́льшим ребёнком'], ['build_max_heap(a)          # from the middle to the start: sift(i)', 'for end = n-1 .. 1:', '  swap(a[0], a[end])        # max goes to the end', '  sift(0, end)              # restore the heap', 'sift(i): while a child is larger — swap with the larger child']),
  make: (api) => Algo.shuffled(api, 10),
  run(a) {
    a = a.slice(); const F = [], done = [];
    const p = (l, t, hi = {}) => F.push({ s: { a: a.slice(), hi, done: done.slice() }, l, t });
    const sift = (i, size, line) => {
      for (;;) {
        let big = i; const l = 2 * i + 1, r = l + 1;
        if (l < size && a[l] > a[big]) big = l;
        if (r < size && a[r] > a[big]) big = r;
        if (big === i) return;
        p(4, L(`${a[big]} больше родителя ${a[i]} — меняем`, `${a[big]} is larger than its parent ${a[i]} — swap`), { [i]: 'warn', [big]: 'warn' });
        [a[i], a[big]] = [a[big], a[i]];
        p(line, L('Поменяли', 'Swapped'), { [i]: 'bad', [big]: 'bad' });
        i = big;
      }
    };
    p(0, L('Строим max-кучу: дети узла i — это 2i+1 и 2i+2', 'Build a max-heap: the children of node i are 2i+1 and 2i+2'));
    for (let i = (a.length >> 1) - 1; i >= 0; i--) sift(i, a.length, 0);
    p(0, L(`Куча готова: максимум ${a[0]} в корне`, `Heap ready: the max ${a[0]} is at the root`), { 0: 'good' });
    for (let end = a.length - 1; end > 0; end--) {
      [a[0], a[end]] = [a[end], a[0]];
      done.push(end);
      p(2, L(`Максимум ${a[end]} — на позицию ${end}`, `The max ${a[end]} goes to position ${end}`), { [end]: 'good' });
      sift(0, end, 3);
    }
    done.push(0); p(1, L('Готово!', 'Done!'));
    return F;
  },
  draw: Algo.bars,
}));
