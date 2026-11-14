// «Собери код» (задачи Парсонса): строки рабочего решения перемешаны — расставь их по порядку.
// Доказанно помогает научиться писать код: тренирует структуру программы без синтаксического шума.
// Каждое решение проверяется автотестами в настоящем Python (tools/check_games.mjs).
(() => {
  const BANK = [
    { d: 1, task: L('Сумма всех чисел списка', 'Sum of all numbers in a list'), code: `def total(a):
    s = 0
    for x in a:
        s += x
    return s`, test: 'assert total([1, 2, 3]) == 6 and total([]) == 0' },
    { d: 1, task: L('Палиндром ли строка (без учёта регистра)', 'Is the string a palindrome (ignoring case)'), code: `def is_pal(s):
    s = s.lower()
    return s == s[::-1]`, test: 'assert is_pal("Abba") and not is_pal("abc")' },
    { d: 1, task: L('Факториал рекурсией', 'Factorial with recursion'), code: `def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)`, test: 'assert fact(5) == 120 and fact(0) == 1' },
    { d: 1, task: L('Слова строки в обратном порядке', 'Words of a string in reverse order'), code: `def reverse_words(s):
    words = s.split()
    words.reverse()
    return " ".join(words)`, test: L('assert reverse_words("я люблю код") == "код люблю я"', 'assert reverse_words("i love code") == "code love i"') },
    { d: 1, task: L('НОД (алгоритм Евклида)', 'GCD (Euclid’s algorithm)'), code: `def gcd(a, b):
    while b:
        a, b = b, a % b
    return a`, test: 'assert gcd(18, 12) == 6 and gcd(7, 3) == 1' },
    { d: 2, task: L('Максимум списка без max()', 'Maximum of a list without max()'), code: `def maximum(a):
    best = a[0]
    for x in a[1:]:
        if x > best:
            best = x
    return best`, test: 'assert maximum([3, -1, 9, 2]) == 9 and maximum([-5, -2]) == -2' },
    { d: 2, task: L('n-е число Фибоначчи (итеративно)', 'n-th Fibonacci number (iterative)'), code: `def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a`, test: 'assert [fib(i) for i in range(8)] == [0, 1, 1, 2, 3, 5, 8, 13]' },
    { d: 2, task: L('Сколько гласных в строке', 'How many vowels in a string'), code: L(`def vowels(s):
    count = 0
    for ch in s.lower():
        if ch in "аеёиоуыэюя":
            count += 1
    return count`, `def vowels(s):
    count = 0
    for ch in s.lower():
        if ch in "aeiou":
            count += 1
    return count`), test: L('assert vowels("Арбуз") == 2', 'assert vowels("Apple") == 2') },
    { d: 2, task: L('Сумма цифр числа', 'Sum of the digits of a number'), code: `def digit_sum(n):
    s = 0
    while n > 0:
        s += n % 10
        n //= 10
    return s`, test: 'assert digit_sum(1234) == 10 and digit_sum(0) == 0' },
    { d: 2, task: L('Частота каждого символа', 'Frequency of each character'), code: `def freq(s):
    d = {}
    for ch in s:
        d[ch] = d.get(ch, 0) + 1
    return d`, test: 'assert freq("abca") == {"a": 2, "b": 1, "c": 1}' },
    { d: 3, task: L('Простое ли число', 'Is the number prime'), code: `def is_prime(n):
    if n < 2:
        return False
    for d in range(2, int(n ** 0.5) + 1):
        if n % d == 0:
            return False
    return True`, test: 'assert [n for n in range(20) if is_prime(n)] == [2, 3, 5, 7, 11, 13, 17, 19]' },
    { d: 3, task: L('Бинарный поиск: индекс x или -1', 'Binary search: index of x or -1'), code: `def binary_search(a, x):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == x:
            return mid
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`, test: 'assert binary_search([1, 3, 5, 7, 9], 7) == 3 and binary_search([1, 3], 2) == -1' },
    { d: 3, task: L('Сортировка пузырьком', 'Bubble sort'), code: `def bubble(a):
    for i in range(len(a) - 1):
        for j in range(len(a) - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
    return a`, test: 'assert bubble([5, 2, 9, 1]) == [1, 2, 5, 9]' },
    { d: 3, task: L('Два числа с суммой target (индексы)', 'Two numbers that sum to target (indices)'), code: `def two_sum(a, target):
    seen = {}
    for i, x in enumerate(a):
        if target - x in seen:
            return seen[target - x], i
        seen[x] = i
    return None`, test: 'assert two_sum([2, 7, 11, 15], 9) == (0, 1) and two_sum([1, 2], 7) is None' },
    { d: 3, task: L('Слияние двух отсортированных списков', 'Merge two sorted lists'), code: `def merge(a, b):
    out, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    return out + a[i:] + b[j:]`, test: 'assert merge([1, 4, 6], [2, 3, 7]) == [1, 2, 3, 4, 6, 7]' },
    { d: 3, task: L('Быстрое возведение в степень', 'Fast exponentiation'), code: `def power(x, n):
    if n == 0:
        return 1
    half = power(x, n // 2)
    if n % 2 == 0:
        return half * half
    return half * half * x`, test: 'assert power(2, 10) == 1024 and power(3, 5) == 243' },
  ];

  Arcade.register({
    bank: BANK, // для автопроверки
    howto: L('Строки работающей функции на Python перемешаны. Тапай их в правильном порядке (отступы подсказывают вложенность). Тап по уже поставленной строке возвращает её назад. Ошибка — минус 10 секунд. 4 минуты.', 'The lines of a working Python function are shuffled. Tap them in the right order (indentation hints at nesting). Tapping a placed line sends it back. A mistake costs 10 seconds. 4 minutes.'),
    start(api) {
      const box = api.el('div', 'appbox');
      const task = api.el('div', '', box);
      task.style.cssText = 'font-weight:700';
      const answer = api.el('div', 'codebox', box);
      api.el('div', 'hint', box, L('Строки (тапни по порядку):', 'Lines (tap in order):'));
      const pool = api.el('div', 'codebox pool', box);
      const tm = api.timer(240);
      const maxD = () => (api.mode === 'level' ? (api.level <= 3 ? 1 : api.level <= 8 ? 2 : 3) : api.score < 3 ? 1 : api.score < 7 ? 2 : 3);
      let cur, placed, left, order = [];

      function pickTask() {
        const d = maxD();
        const fits = BANK.filter((t) => t.d <= d && (d === 1 || t.d >= d - 1));
        if (!order.length) order = api.shuffle(fits);
        return order.pop();
      }
      function next() {
        cur = pickTask();
        task.textContent = '🧩 ' + cur.task;
        const lines = cur.code.split('\n');
        placed = [];
        left = api.shuffle(lines.map((t, i) => ({ t, i })));
        draw();
      }
      const line = (parent, item, cls) => { const b = api.el('button', 'cline ' + (cls || ''), parent); b.textContent = item.t; return b; };
      function draw(bad = -1) {
        answer.innerHTML = '';
        if (!placed.length) api.el('div', 'hint', answer, L('Здесь появится твоя программа', 'Your program will appear here'));
        placed.forEach((it, k) => { const b = line(answer, it, k === bad ? 'bad' : ''); api.on(b, 'click', () => { left.push(placed.splice(k, 1)[0]); draw(); }); });
        pool.innerHTML = '';
        left.forEach((it, k) => { const b = line(pool, it); api.on(b, 'click', () => { placed.push(left.splice(k, 1)[0]); api.haptic('select'); draw(); if (!left.length) check(); }); });
      }
      function check() {
        const want = cur.code.split('\n');
        const bad = placed.findIndex((it, k) => it.t !== want[k]); // одинаковые строки взаимозаменяемы — сравниваем текст
        if (bad < 0) {
          api.addScore(1); api.haptic('success'); api.tone(990, 120);
          answer.classList.add('ok');
          api.after(700, () => { answer.classList.remove('ok'); next(); });
        } else {
          tm.add(-10); api.haptic('error');
          draw(bad);
          api.toast(L(`Строка ${bad + 1} не на своём месте`, `Line ${bad + 1} is out of place`));
        }
      }
      next();
    },
  });
})();
