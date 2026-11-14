// Пирамидальная сортировка (heap sort)
Arcade.register(Algo.viz({
  about: 'Сначала превращаем массив в max-кучу (родитель ≥ детей), потом раз за разом меняем корень — максимум — с последним элементом и «просеиваем» новый корень вниз.',
  complexity: 'O(n log n) всегда, O(1) доп. памяти; неустойчивая',
  code: ['build_max_heap(a)          # от середины к началу: sift(i)', 'for end = n-1 .. 1:', '  swap(a[0], a[end])        # максимум — в конец', '  sift(0, end)              # восстановить кучу', 'sift(i): пока ребёнок больше — меняем с бо́льшим ребёнком'],
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
        p(4, `${a[big]} больше родителя ${a[i]} — меняем`, { [i]: 'warn', [big]: 'warn' });
        [a[i], a[big]] = [a[big], a[i]];
        p(line, 'Поменяли', { [i]: 'bad', [big]: 'bad' });
        i = big;
      }
    };
    p(0, 'Строим max-кучу: дети узла i — это 2i+1 и 2i+2');
    for (let i = (a.length >> 1) - 1; i >= 0; i--) sift(i, a.length, 0);
    p(0, `Куча готова: максимум ${a[0]} в корне`, { 0: 'good' });
    for (let end = a.length - 1; end > 0; end--) {
      [a[0], a[end]] = [a[end], a[0]];
      done.push(end);
      p(2, `Максимум ${a[end]} — на позицию ${end}`, { [end]: 'good' });
      sift(0, end, 3);
    }
    done.push(0); p(1, 'Готово!');
    return F;
  },
  draw: Algo.bars,
}));
