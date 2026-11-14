// «Найди ошибку»: в функции одна строка с багом — найди её. После ответа — объяснение и исправление.
// Автопроверка запускает каждую задачу в Python: исправленная версия проходит тест, версия с багом — нет.
(() => {
  const BANK = [
    { task: 'Сумма чисел от 1 до n', code: ['def sum_to(n):', '    s = 0', '    for i in range(1, n):', '        s += i', '    return s'], bug: 2, fix: '    for i in range(1, n + 1):', why: 'range не включает правую границу — n не попадает в сумму.', test: 'assert sum_to(3) == 6' },
    { task: 'Максимум списка', code: ['def maximum(a):', '    best = 0', '    for x in a:', '        if x > best:', '            best = x', '    return best'], bug: 1, fix: '    best = a[0]', why: 'Для списка из отрицательных чисел вернётся 0, которого в списке нет.', test: 'assert maximum([-3, -1, -7]) == -1' },
    { task: 'Бинарный поиск', code: ['def bs(a, x):', '    lo, hi = 0, len(a)', '    while lo <= hi:', '        mid = (lo + hi) // 2', '        if a[mid] == x:', '            return mid', '        if a[mid] < x:', '            lo = mid + 1', '        else:', '            hi = mid - 1', '    return -1'], bug: 1, fix: '    lo, hi = 0, len(a) - 1', why: 'При lo <= hi индекс hi должен быть последним элементом, иначе a[mid] выйдет за границу.', test: 'assert bs([1, 3, 5], 7) == -1 and bs([1, 3, 5], 5) == 2' },
    { task: 'Палиндром без учёта регистра', code: ['def is_pal(s):', '    s = s.strip()', '    return s == s[::-1]'], bug: 1, fix: '    s = s.lower()', why: '«Abba» не палиндром, пока буквы разного регистра.', test: 'assert is_pal("Abba")' },
    { task: 'Факториал', code: ['def fact(n):', '    if n == 1:', '        return 1', '    return n * fact(n - 1)'], bug: 1, fix: '    if n <= 1:', why: 'fact(0) уходит в бесконечную рекурсию: 0, -1, -2…', test: 'assert fact(0) == 1 and fact(4) == 24' },
    { task: 'Числа Фибоначчи', code: ['def fib(n):', '    a, b = 0, 1', '    for _ in range(n):', '        a, b = b, a + a', '    return a'], bug: 3, fix: '        a, b = b, a + b', why: 'Следующее число — сумма двух предыдущих: a + b, а не a + a.', test: 'assert [fib(i) for i in range(7)] == [0, 1, 1, 2, 3, 5, 8]' },
    { task: 'Сколько гласных', code: ['def vowels(s):', '    count = 0', '    for ch in s:', '        if ch in "аеёиоуыэюя":', '            count += 1', '    return count'], bug: 2, fix: '    for ch in s.lower():', why: 'Заглавные гласные не считаются — строку нужно привести к нижнему регистру.', test: 'assert vowels("АРБУЗ") == 2' },
    { task: 'Среднее арифметическое', code: ['def average(a):', '    return sum(a) // len(a)'], bug: 1, fix: '    return sum(a) / len(a)', why: '// — целочисленное деление, дробная часть теряется.', test: 'assert average([1, 2]) == 1.5' },
    { task: 'Простое ли число', code: ['def is_prime(n):', '    if n < 2:', '        return False', '    for d in range(2, int(n ** 0.5)):', '        if n % d == 0:', '            return False', '    return True'], bug: 3, fix: '    for d in range(2, int(n ** 0.5) + 1):', why: 'Корень тоже нужно проверить: для 9 проверяется только 2, и 9 «простое».', test: 'assert not is_prime(9) and not is_prime(25) and is_prime(7)' },
    { task: 'Разворот списка на месте', code: ['def reverse(a):', '    i, j = 0, len(a)', '    while i < j:', '        a[i], a[j] = a[j], a[i]', '        i += 1', '        j -= 1', '    return a'], bug: 1, fix: '    i, j = 0, len(a) - 1', why: 'Последний индекс — len(a) − 1; a[len(a)] выходит за границу.', test: 'assert reverse([1, 2, 3]) == [3, 2, 1]' },
    { task: 'Количество слов', code: ['def count_words(s):', '    return len(s.split(" "))'], bug: 1, fix: '    return len(s.split())', why: 'split(" ") создаёт пустые «слова» на месте лишних пробелов; split() без аргумента их убирает.', test: 'assert count_words("  привет   мир ") == 2' },
    { task: 'НОД (Евклид)', code: ['def gcd(a, b):', '    while b:', '        a, b = b, b % a', '    return a'], bug: 2, fix: '        a, b = b, a % b', why: 'Остаток берётся от деления a на b: a % b.', test: 'assert gcd(18, 12) == 6 and gcd(12, 18) == 6' },
    { task: 'Последние n элементов', code: ['def last_n(a, n):', '    return a[-n - 1:]'], bug: 1, fix: '    return a[-n:]', why: 'a[-n:] — это ровно n последних элементов; −n−1 берёт лишний.', test: 'assert last_n([1, 2, 3, 4], 2) == [3, 4]' },
    { task: 'Самое большое число из строк', code: ['def max_number(strs):', '    return max(strs)'], bug: 1, fix: '    return max(strs, key=int)', why: 'Строки сравниваются посимвольно: "9" > "10". Нужно сравнивать как числа.', test: 'assert max_number(["9", "10", "2"]) == "10"' },
  ];

  Arcade.register({
    bank: BANK, // для автопроверки
    howto: 'В каждой функции ровно одна строка с ошибкой. Тапни её. После ответа увидишь, почему это баг и как исправить. Ошибка — минус 8 секунд. 2,5 минуты.',
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
        task.textContent = '🐞 ' + cur.task + ': где ошибка?';
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
        expl.innerHTML = `<b>${i === cur.bug ? '✅ Верно!' : '❌ Ошибка в другой строке.'}</b> ${cur.why}<br><code>${cur.fix.trim().replace(/[&<>]/g, '')}</code>`;
        api.after(2600, next);
      });
      next();
    },
  });
})();
