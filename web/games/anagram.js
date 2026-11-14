Arcade.register({
  howto: L('Собери слово из букв: тапай буквы по порядку, тап по слову стирает последнюю. «Пропустить» стоит 3 секунды. Всего 60 секунд.', 'Build the word from the letters: tap them in order, tap the word to erase the last one. “Skip” costs 3 seconds. 60 seconds in total.'),
  start(api) {
    const WORDS = ('кошка собака лампа книга рыбка звезда облако ракета дерево машина морковь апельсин зебра школа пирог ' +
      'сахар вагон поезд карман ворона сосна шапка перчатка клубника малина груша лимон арбуз ведро кубик мячик пальто ' +
      'дракон замок король рыцарь корона весна осень гроза радуга остров пустыня компас фонарь ромашка тюльпан улитка ' +
      'медведь лисица кролик черепаха пингвин жираф верблюд бегемот крокодил попугай чайник вилка ложка тарелка кастрюля ' +
      'диван кресло подушка зеркало телефон гитара барабан скрипка театр музей деревня озеро океан вулкан планета комета ' +
      'снежинка шоколад батон молоко сметана капуста огурец тыква яблоко бабочка стрекоза муравей пчела паук').split(' ');
    if (LANG === 'en') WORDS.splice(0, WORDS.length, ...('planet rabbit garden window pencil castle dragon guitar orange banana rocket bottle candle wizard forest island bridge camera turtle monkey ' +
      'pirate silver jacket mirror basket cookie button carpet ladder parrot spider tomato potato carrot cherry lemon melon apple grape peach ' +
      'river desert valley canyon meadow harbor winter summer autumn spring thunder rainbow comet galaxy anchor compass lantern helmet saddle ' +
      'kitten puppy donkey zebra tiger lizard falcon dolphin penguin giraffe camel walnut pepper cheese butter bread honey sugar coffee teapot ' +
      'pillow blanket sofa chair table piano violin trumpet drum theatre museum village ocean volcano jungle market school doctor farmer sailor').split(' '));
    const box = api.el('div', 'fill');
    const ans = api.el('div', 'tile', box);
    ans.style.cssText = 'aspect-ratio:auto;width:min(92vw,420px);min-height:64px;font-size:30px;letter-spacing:3px;text-transform:uppercase';
    const letters = api.el('div', '', box);
    letters.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:420px';
    const skip = api.el('button', 'btn ghost', box, L('Пропустить (−3 с)', 'Skip (−3 s)'));
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
