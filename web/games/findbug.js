// «Найди ошибку»: в функции одна строка с багом — найди её. После ответа — объяснение и исправление.
// Автопроверка запускает каждую задачу в Python: исправленная версия проходит тест, версия с багом — нет.
(() => {
  const BANK = [
    { task: L('Сумма чисел от 1 до n', 'Sum of numbers from 1 to n'), code: ['def sum_to(n):', '    s = 0', '    for i in range(1, n):', '        s += i', '    return s'], bug: 2, fix: '    for i in range(1, n + 1):', why: L('range не включает правую границу — n не попадает в сумму.', 'range excludes the upper bound — n is left out of the sum.'), test: 'assert sum_to(3) == 6' },
    { task: L('Максимум списка', 'Maximum of a list'), code: ['def maximum(a):', '    best = 0', '    for x in a:', '        if x > best:', '            best = x', '    return best'], bug: 1, fix: '    best = a[0]', why: L('Для списка из отрицательных чисел вернётся 0, которого в списке нет.', 'For a list of negative numbers it returns 0, which is not even in the list.'), test: 'assert maximum([-3, -1, -7]) == -1' },
    { task: L('Бинарный поиск', 'Binary search'), code: ['def bs(a, x):', '    lo, hi = 0, len(a)', '    while lo <= hi:', '        mid = (lo + hi) // 2', '        if a[mid] == x:', '            return mid', '        if a[mid] < x:', '            lo = mid + 1', '        else:', '            hi = mid - 1', '    return -1'], bug: 1, fix: '    lo, hi = 0, len(a) - 1', why: L('При lo <= hi индекс hi должен быть последним элементом, иначе a[mid] выйдет за границу.', 'With lo <= hi, hi must be the index of the last element, otherwise a[mid] goes out of range.'), test: 'assert bs([1, 3, 5], 7) == -1 and bs([1, 3, 5], 5) == 2' },
    { task: L('Палиндром без учёта регистра', 'Case-insensitive palindrome'), code: ['def is_pal(s):', '    s = s.strip()', '    return s == s[::-1]'], bug: 1, fix: '    s = s.lower()', why: L('«Abba» не палиндром, пока буквы разного регистра.', '“Abba” is not a palindrome while the letters differ in case.'), test: 'assert is_pal("Abba")' },
    { task: L('Факториал', 'Factorial'), code: ['def fact(n):', '    if n == 1:', '        return 1', '    return n * fact(n - 1)'], bug: 1, fix: '    if n <= 1:', why: L('fact(0) уходит в бесконечную рекурсию: 0, -1, -2…', 'fact(0) recurses forever: 0, -1, -2…'), test: 'assert fact(0) == 1 and fact(4) == 24' },
    { task: L('Числа Фибоначчи', 'Fibonacci numbers'), code: ['def fib(n):', '    a, b = 0, 1', '    for _ in range(n):', '        a, b = b, a + a', '    return a'], bug: 3, fix: '        a, b = b, a + b', why: L('Следующее число — сумма двух предыдущих: a + b, а не a + a.', 'The next number is the sum of the previous two: a + b, not a + a.'), test: 'assert [fib(i) for i in range(7)] == [0, 1, 1, 2, 3, 5, 8]' },
    { task: L('Сколько гласных', 'Count the vowels'), code: ['def vowels(s):', '    count = 0', '    for ch in s:', L('        if ch in "аеёиоуыэюя":', '        if ch in "aeiou":'), '            count += 1', '    return count'], bug: 2, fix: '    for ch in s.lower():', why: L('Заглавные гласные не считаются — строку нужно привести к нижнему регистру.', 'Capital vowels are not counted — the string must be lower-cased.'), test: L('assert vowels("АРБУЗ") == 2', 'assert vowels("APPLE") == 2') },
    { task: L('Среднее арифметическое', 'Arithmetic mean'), code: ['def average(a):', '    return sum(a) // len(a)'], bug: 1, fix: '    return sum(a) / len(a)', why: L('// — целочисленное деление, дробная часть теряется.', '// is integer division — the fractional part is lost.'), test: 'assert average([1, 2]) == 1.5' },
    { task: L('Простое ли число', 'Is the number prime?'), code: ['def is_prime(n):', '    if n < 2:', '        return False', '    for d in range(2, int(n ** 0.5)):', '        if n % d == 0:', '            return False', '    return True'], bug: 3, fix: '    for d in range(2, int(n ** 0.5) + 1):', why: L('Корень тоже нужно проверить: для 9 проверяется только 2, и 9 «простое».', 'The square root must be checked too: for 9 only 2 is tried, so 9 comes out “prime”.'), test: 'assert not is_prime(9) and not is_prime(25) and is_prime(7)' },
    { task: L('Разворот списка на месте', 'Reverse a list in place'), code: ['def reverse(a):', '    i, j = 0, len(a)', '    while i < j:', '        a[i], a[j] = a[j], a[i]', '        i += 1', '        j -= 1', '    return a'], bug: 1, fix: '    i, j = 0, len(a) - 1', why: L('Последний индекс — len(a) − 1; a[len(a)] выходит за границу.', 'The last index is len(a) − 1; a[len(a)] is out of range.'), test: 'assert reverse([1, 2, 3]) == [3, 2, 1]' },
    { task: L('Количество слов', 'Word count'), code: ['def count_words(s):', '    return len(s.split(" "))'], bug: 1, fix: '    return len(s.split())', why: L('split(" ") создаёт пустые «слова» на месте лишних пробелов; split() без аргумента их убирает.', 'split(" ") creates empty “words” for extra spaces; split() with no argument drops them.'), test: L('assert count_words("  привет   мир ") == 2', 'assert count_words("  hello   world ") == 2') },
    { task: L('НОД (Евклид)', 'GCD (Euclid)'), code: ['def gcd(a, b):', '    while b:', '        a, b = b, b % a', '    return a'], bug: 2, fix: '        a, b = b, a % b', why: L('Остаток берётся от деления a на b: a % b.', 'The remainder is of a divided by b: a % b.'), test: 'assert gcd(18, 12) == 6 and gcd(12, 18) == 6' },
    { task: L('Последние n элементов', 'Last n elements'), code: ['def last_n(a, n):', '    return a[-n - 1:]'], bug: 1, fix: '    return a[-n:]', why: L('a[-n:] — это ровно n последних элементов; −n−1 берёт лишний.', 'a[-n:] is exactly the last n elements; −n−1 takes one too many.'), test: 'assert last_n([1, 2, 3, 4], 2) == [3, 4]' },
    { task: L('Самое большое число из строк', 'Largest number among strings'), code: ['def max_number(strs):', '    return max(strs)'], bug: 1, fix: '    return max(strs, key=int)', why: L('Строки сравниваются посимвольно: "9" > "10". Нужно сравнивать как числа.', 'Strings compare character by character: "9" > "10". Compare them as numbers.'), test: 'assert max_number(["9", "10", "2"]) == "10"' },
  ];

  Arcade.register({
    bank: BANK, // для автопроверки
    howto: L('В каждой функции ровно одна строка с ошибкой. Тапни её. После ответа увидишь, почему это баг и как исправить. Ошибка — минус 8 секунд. 2,5 минуты.', 'Each function has exactly one buggy line. Tap it. After answering you will see why it is a bug and how to fix it. A mistake costs 8 seconds. 2.5 minutes.'),
    start(api) {
      const box = api.el('div', 'appbox');
      const task = api.el('div', '', box); task.style.fontWeight = '700';
      const codeBox = api.el('div', 'codebox', box);
      const expl = api.el('div', 'hint', box); expl.style.minHeight = '3em';
      const tm = api.timer(150);
      let cur, order = [], lock = false;
      function next() {
        if (!order.length) order = api.shuffle(BANK);
        cur = order.pop(); lock = false;
        task.textContent = '🐞 ' + cur.task + L(': где ошибка?', ': where is the bug?');
        expl.textContent = '';
        codeBox.innerHTML = '';
        cur.code.forEach((t, i) => { const b = api.el('button', 'cline', codeBox); b.textContent = t; b.dataset.i = i; });
      }
      api.on(codeBox, 'click', (e) => {
        const b = e.target.closest('button');
        if (!b || lock) return;
        lock = true;
        const i = +b.dataset.i, right = codeBox.children[cur.bug];
        if (i === cur.bug) { api.addScore(1); api.haptic('success'); b.classList.add('okline'); }
        else { tm.add(-8); api.haptic('error'); b.classList.add('bad'); right.classList.add('okline'); }
        expl.innerHTML = `<b>${i === cur.bug ? L('✅ Верно!', '✅ Correct!') : L('❌ Ошибка в другой строке.', '❌ The bug is on another line.')}</b> ${cur.why}<br><code>${cur.fix.trim().replace(/[&<>]/g, '')}</code>`;
        api.after(2600, next);
      });
      next();
    },
  });
})();
