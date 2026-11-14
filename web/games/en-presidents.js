// US history: under which president? Events, laws and documents → president. Wrong options come from the same era.
(() => {
  const R = {
    early: [
      ['First president; Farewell Address warning against parties', 'George Washington'], ['Louisiana Purchase (1803)', 'Thomas Jefferson'],
      ['Lewis and Clark Expedition', 'Thomas Jefferson'], ['War of 1812', 'James Madison'], ['Monroe Doctrine (1823)', 'James Monroe'],
      ['Indian Removal Act and the Trail of Tears', 'Andrew Jackson'], ['Mexican–American War', 'James K. Polk'], ['Alien and Sedition Acts', 'John Adams'],
    ],
    civil: [
      ['Emancipation Proclamation', 'Abraham Lincoln'], ['Gettysburg Address', 'Abraham Lincoln'], ['Purchase of Alaska (1867)', 'Andrew Johnson'],
      ['First president to be impeached (1868)', 'Andrew Johnson'], ['End of Reconstruction (Compromise of 1877)', 'Rutherford B. Hayes'],
      ['Spanish–American War (1898)', 'William McKinley'], ['Trust-busting and national parks; the “Square Deal”', 'Theodore Roosevelt'],
      ['Building of the Panama Canal begins (1904)', 'Theodore Roosevelt'],
    ],
    modern: [
      ['US enters World War I; the Fourteen Points', 'Woodrow Wilson'], ['The New Deal', 'Franklin D. Roosevelt'], ['Attack on Pearl Harbor; US enters World War II', 'Franklin D. Roosevelt'],
      ['Atomic bombs dropped on Japan', 'Harry S. Truman'], ['Marshall Plan and the Truman Doctrine', 'Harry S. Truman'], ['Interstate Highway System (1956)', 'Dwight D. Eisenhower'],
      ['Sending troops to integrate Little Rock Central High (1957)', 'Dwight D. Eisenhower'], ['Cuban Missile Crisis', 'John F. Kennedy'],
      ['Civil Rights Act of 1964', 'Lyndon B. Johnson'], ['Great Society programmes, Medicare', 'Lyndon B. Johnson'], ['Moon landing (1969)', 'Richard Nixon'],
      ['Watergate scandal and resignation', 'Richard Nixon'], ['Camp David Accords', 'Jimmy Carter'], ['“Tear down this wall!” speech', 'Ronald Reagan'],
      ['Gulf War (1991)', 'George H. W. Bush'], ['NAFTA signed into law', 'Bill Clinton'], ['September 11 attacks; war in Afghanistan', 'George W. Bush'],
      ['Affordable Care Act (“Obamacare”)', 'Barack Obama'],
    ],
  };
  const EASY = /First president|Emancipation|Gettysburg|New Deal|Pearl Harbor|Cuban|Watergate|September 11|Louisiana/;
  Arcade.register(Learn.deck({
    ask: 'Under which president?',
    rule: 'US presidents and the events, laws and documents of their terms. Wrong options come from the same era, as in real exams.',
    cards: Object.entries(R).flatMap(([g, list]) => list.map(([q, a]) => ({ q, a, g, d: EASY.test(q) ? 1 : g === 'modern' ? 2 : 3 }))),
  }));
})();
