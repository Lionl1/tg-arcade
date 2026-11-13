Arcade.register({
  howto: 'Собери слово из букв: тапай буквы по порядку, тап по слову стирает последнюю. «Пропустить» стоит 3 секунды. Всего 60 секунд.',
  start(api) {
    const WORDS = ('кошка собака лампа книга рыбка звезда облако ракета дерево машина морковь апельсин зебра школа пирог ' +
      'сахар вагон поезд карман ворона сосна шапка перчатка клубника малина груша лимон арбуз ведро кубик мячик пальто ' +
      'дракон замок король рыцарь корона весна осень гроза радуга остров пустыня компас фонарь ромашка тюльпан улитка ' +
      'медведь лисица кролик черепаха пингвин жираф верблюд бегемот крокодил попугай чайник вилка ложка тарелка кастрюля ' +
      'диван кресло подушка зеркало телефон гитара барабан скрипка театр музей деревня озеро океан вулкан планета комета ' +
      'снежинка шоколад батон молоко сметана капуста огурец тыква яблоко бабочка стрекоза муравей пчела паук').split(' ');
    const box = api.el('div', 'fill');
    const ans = api.el('div', 'tile', box);
    ans.style.cssText = 'aspect-ratio:auto;width:min(92vw,420px);min-height:64px;font-size:30px;letter-spacing:3px;text-transform:uppercase';
    const letters = api.el('div', '', box);
    letters.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:420px';
    const skip = api.el('button', 'btn ghost', box, 'Пропустить (−3 с)');
    skip.style.flex = 'none';
    const tm = api.timer(60);
    let word = '', picked = [];
    const bag = api.shuffle(WORDS);

    function next() {
      word = bag.length ? bag.pop() : api.pick(WORDS);
      let mix;
      do mix = api.shuffle([...word]); while (mix.join('') === word);
      letters.innerHTML = ''; picked = []; ans.textContent = '';
      mix.forEach((ch, i) => {
        const b = api.el('button', 'tile', letters, ch.toUpperCase());
        b.style.cssText = 'width:48px;font-size:24px';
        b.dataset.i = i; b.dataset.ch = ch;
      });
    }
    function render() {
      ans.textContent = picked.map((b) => b.dataset.ch).join('');
      for (const b of letters.children) b.style.visibility = picked.includes(b) ? 'hidden' : '';
    }
    api.on(letters, 'pointerdown', (e) => {
      const b = e.target.closest('button');
      if (!b || picked.includes(b)) return;
      picked.push(b); api.haptic('select'); render();
      if (picked.length < word.length) return;
      if (ans.textContent === word) {
        api.addScore(1); api.haptic('success'); api.tone(880, 80);
        api.after(250, next);
      } else { api.haptic('error'); api.shake(ans); api.after(300, () => { picked = []; render(); }); }
    });
    api.on(ans, 'pointerdown', () => { picked.pop(); render(); });
    api.on(skip, 'click', () => { tm.add(-3); ans.textContent = word; api.after(400, next); });
    next();
  },
});
