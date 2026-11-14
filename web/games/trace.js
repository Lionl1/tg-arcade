// «Что выведет код?»: трассировка Python в уме. Генератор заданий; ответы сверяются с настоящим Python в автопроверке.
(() => {
  // repr в стиле Python
  const pyr = (v) => (Array.isArray(v) ? '[' + v.map(pyr).join(', ') + ']' : typeof v === 'string' ? `'${v}'` : typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v));
  const WORDS = ['python', 'kotlin', 'banana', 'stack', 'queue', 'matrix', 'level', 'rotor', 'sorting', 'binary'];

  Arcade.register(Learn.deck({
    ask: L('Что выведет код?', 'What does the code print?'),
    mono: true,
    seconds: 120,
    howto: L('Прочитай программу на Python и выбери, что она напечатает. Тренирует умение «исполнять код в голове» — главный навык программиста. С ростом счёта программы сложнее. 2 минуты, ошибка −3 с.', 'Read the Python program and choose what it prints. Trains “running code in your head” — the core programming skill. Programs get harder as your score grows. 2 minutes, a mistake costs 3 s.'),
    gen(api) {
      const R = (lo, hi) => lo + api.randi(hi - lo + 1);
      const lvl = Math.max(api.score, (api.level || 0) * 2);
      const T = [
        () => { const a = R(0, 4), b = R(a + 3, a + 8); let s = 0; for (let i = a; i < b; i++) s += i;
          return { q: `s = 0\nfor i in range(${a}, ${b}):\n    s += i\nprint(s)`, a: String(s), wrong: [s + b, s - a, s + 1].map(String) }; },
        () => { const arr = [...Array(6)].map(() => R(1, 9)), i = R(0, 3), j = R(i + 1, 6);
          return { q: `a = ${pyr(arr)}\nprint(a[${i}:${j}])`, a: pyr(arr.slice(i, j)), wrong: [pyr(arr.slice(i, j + 1)), pyr(arr.slice(i + 1, j + 1)), pyr(arr.slice(Math.max(0, i - 1), j))] }; },
        () => { const arr = api.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 6), k = R(1, 6); // разные числа — иначе варианты совпадут
          return { q: `a = ${pyr(arr)}\nprint(a[-${k}])`, a: String(arr[6 - k]), wrong: [arr[k - 1], arr[(7 - k) % 6], arr[(6 - k + 1) % 6]].map(String) }; },
        () => { const w = api.pick(WORDS);
          return { q: `s = "${w}"\nprint(s[::-1])`, a: [...w].reverse().join(''), wrong: [w, w.slice(1) + w[0], [...w].reverse().join('').slice(1)] }; },
        () => { const arr = [...Array(7)].map(() => R(1, 5)), n = new Set(arr).size;
          return { q: `a = ${pyr(arr)}\nprint(len(set(a)))`, a: String(n), wrong: [arr.length, n + 1, n - 1].map(String) }; },
        () => { const n = R(5, 200); let x = n, c = 0; while (x > 1) { x = Math.floor(x / 2); c++; }
          return { q: `x = ${n}\nc = 0\nwhile x > 1:\n    x //= 2\n    c += 1\nprint(c)`, a: String(c), wrong: [c + 1, c - 1, c + 2].map(String) }; },
        () => { const arr = [1, 2, 3].map(() => R(1, 9)), x = R(10, 20); const r = arr.slice(1).concat([x]);
          return { q: `a = ${pyr(arr)}\na.append(${x})\na.pop(0)\nprint(a)`, a: pyr(r), wrong: [pyr(arr.concat([x])), pyr(arr.slice(0, 2).concat([x])), pyr([x].concat(arr.slice(1)))] }; },
        () => { const w = api.pick(WORDS), ch = api.pick([...new Set(w)]); const cnt = [...w].filter((c) => c === ch).length;
          return { q: `d = {}\nfor ch in "${w}":\n    d[ch] = d.get(ch, 0) + 1\nprint(d["${ch}"])`, a: String(cnt), wrong: [cnt + 1, w.length, cnt + 2].map(String) }; },
        () => { const n = R(4, 9); const r = []; for (let x = 0; x < n; x++) if (x % 2 === 0) r.push(x * x);
          return { q: `print([x * x for x in range(${n})\n       if x % 2 == 0])`, a: pyr(r), wrong: [pyr(r.concat([n * n])), pyr(r.slice(1)), pyr([...Array(n)].map((_, x) => x * x).filter((v, x) => x % 2 === 1))] }; },
        () => { const n = R(3, 7); let c = 0; for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) c++;
          return { q: `c = 0\nfor i in range(${n}):\n    for j in range(i):\n        c += 1\nprint(c)`, a: String(c), wrong: [n * n, n * (n + 1) / 2, c - 1].map(String) }; },
        () => { const a = R(10, 60), b = R(3, 9);
          return { q: `print(${a} // ${b}, ${a} % ${b})`, a: `${Math.floor(a / b)} ${a % b}`, wrong: [`${a % b} ${Math.floor(a / b)}`, `${(a / b).toFixed(1)} ${a % b}`, `${Math.floor(a / b) + 1} ${a % b}`] }; },
        () => { const a = R(1, 9), b = R(1, 9), c = R(1, 9); const v = (a > b && b > c) || a === c;
          return { q: `a, b, c = ${a}, ${b}, ${c}\nprint(a > b and b > c or a == c)`, a: pyr(v), wrong: [pyr(!v)] }; },
        () => { const arr = api.shuffle([...Array(20)].map((_, i) => i + 1)).slice(0, 5), k = R(0, 4); const s = arr.slice().sort((x, y) => x - y);
          return { q: `a = ${pyr(arr)}\nprint(sorted(a)[${k}])`, a: String(s[k]), wrong: [arr[k], s[4 - k], s[(k + 1) % 5]].map(String) }; },
        () => { const n = R(3, 6); const f = (m) => (m <= 1 ? 1 : m * f(m - 1));
          return { q: `def f(n):\n    if n <= 1:\n        return 1\n    return n * f(n - 1)\n\nprint(f(${n}))`, a: String(f(n)), wrong: [f(n - 1), f(n) + n, n * n].map(String) }; },
      ];
      const easy = 6;
      return api.pick(lvl < 6 ? T.slice(0, easy) : T)();
    },
  }));
})();
