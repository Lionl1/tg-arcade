// History: key dates of world, British and US history — both ways. Wrong options are nearby years.
(() => {
  const DATES = [
    ['Battle of Marathon', -490], ['Assassination of Julius Caesar', -44], ['Fall of the Western Roman Empire', 476], ['Coronation of Charlemagne', 800],
    ['Norman conquest of England (Battle of Hastings)', 1066], ['Magna Carta signed', 1215], ['Start of the Black Death in Europe', 1347], ['Fall of Constantinople', 1453],
    ['Columbus reaches the Americas', 1492], ['Martin Luther’s 95 Theses', 1517], ['Defeat of the Spanish Armada', 1588], ['Jamestown founded', 1607],
    ['Mayflower lands at Plymouth', 1620], ['Start of the English Civil War', 1642], ['Glorious Revolution in England', 1688], ['Acts of Union: Great Britain formed', 1707],
    ['US Declaration of Independence', 1776], ['US Constitution signed', 1787], ['Start of the French Revolution', 1789], ['Battle of Waterloo', 1815],
    ['Slavery Abolition Act in the British Empire', 1833], ['Darwin publishes “On the Origin of Species”', 1859], ['Start of the American Civil War', 1861], ['Emancipation Proclamation', 1863],
    ['Abraham Lincoln assassinated', 1865], ['Wright brothers’ first powered flight', 1903], ['Start of World War I', 1914], ['Russian Revolution', 1917],
    ['End of World War I', 1918], ['Women get the vote in the USA (19th Amendment)', 1920], ['Wall Street Crash', 1929], ['Start of World War II', 1939],
    ['Attack on Pearl Harbor', 1941], ['D-Day landings in Normandy', 1944], ['End of World War II', 1945], ['Treaty of Versailles signed', 1919],
    ['Independence of India', 1947], ['Founding of NATO', 1949], ['Sputnik launched', 1957], ['Yuri Gagarin, first human in space', 1961],
    ['Cuban Missile Crisis', 1962], ['“I Have a Dream” speech', 1963], ['Moon landing (Apollo 11)', 1969], ['Fall of the Berlin Wall', 1989],
    ['Nelson Mandela released from prison', 1990], ['Dissolution of the Soviet Union', 1991], ['First iPhone released', 2007], ['September 11 attacks', 2001],
  ];
  const yr = (y) => (y < 0 ? `${-y} BC` : String(y));
  Arcade.register(Learn.deck({
    ask: 'In which year?',
    askRev: 'What happened in this year?',
    both: true,
    rule: 'Anchor dates of world history. Remember them in pairs and chains: 1914 → 1918, 1939 → 1945.',
    cards: DATES.map(([e, y], i) => {
      const near = [y - 1, y + 1, y + (i % 2 ? 2 : -2), y + 10].filter((v) => v !== 0).map(yr);
      return { q: e, a: yr(y), wrong: near.slice(0, 3), d: Math.abs(y) < 1500 ? 2 : y > 1900 ? 1 : 2 };
    }),
  }));
})();
