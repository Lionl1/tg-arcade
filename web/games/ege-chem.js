// Химия: вещества и формулы (8–11 класс, ЕГЭ). d — сложность. Названия на двух языках.
const CHEM_EN = {"H₂O": "water", "NaCl": "sodium chloride (table salt)", "CO₂": "carbon dioxide", "H₂SO₄": "sulfuric acid", "HCl": "hydrochloric acid", "NH₃": "ammonia", "CH₄": "methane", "HNO₃": "nitric acid", "NaOH": "sodium hydroxide", "CaCO₃": "calcium carbonate (chalk, marble)", "C₂H₅OH": "ethanol", "C₆H₁₂O₆": "glucose", "H₂O₂": "hydrogen peroxide", "CO": "carbon monoxide", "NaHCO₃": "sodium bicarbonate (baking soda)", "KMnO₄": "potassium permanganate", "CH₃COOH": "acetic acid", "O₃": "ozone", "Fe₂O₃": "iron(III) oxide", "CaO": "calcium oxide (quicklime)", "Ca(OH)₂": "calcium hydroxide (slaked lime)", "CuSO₄": "copper(II) sulfate", "AgNO₃": "silver nitrate", "H₃PO₄": "phosphoric acid", "SO₂": "sulfur dioxide", "C₂H₂": "acetylene", "C₆H₆": "benzene"};
Arcade.register(Learn.deck({
  ask: L('Какое это вещество?', 'Which substance is this?'),
  askRev: L('Формула вещества', 'Formula of the substance'),
  both: true,
  big: false,
  cards: [
    ['H₂O', 'вода', 1], ['NaCl', 'хлорид натрия (поваренная соль)', 1], ['CO₂', 'углекислый газ', 1], ['H₂SO₄', 'серная кислота', 1], ['HCl', 'соляная кислота', 1],
    ['NH₃', 'аммиак', 1], ['CH₄', 'метан', 1], ['HNO₃', 'азотная кислота', 2], ['NaOH', 'гидроксид натрия', 2], ['CaCO₃', 'карбонат кальция (мел, мрамор)', 2],
    ['C₂H₅OH', 'этанол', 2], ['C₆H₁₂O₆', 'глюкоза', 2], ['H₂O₂', 'пероксид водорода', 2], ['CO', 'угарный газ', 2], ['NaHCO₃', 'гидрокарбонат натрия (пищевая сода)', 2],
    ['KMnO₄', 'перманганат калия', 2], ['CH₃COOH', 'уксусная кислота', 2], ['O₃', 'озон', 2], ['Fe₂O₃', 'оксид железа(III)', 3], ['CaO', 'оксид кальция (негашёная известь)', 3],
    ['Ca(OH)₂', 'гидроксид кальция (гашёная известь)', 3], ['CuSO₄', 'сульфат меди(II)', 3], ['AgNO₃', 'нитрат серебра', 3], ['H₃PO₄', 'ортофосфорная кислота', 3],
    ['SO₂', 'оксид серы(IV)', 3], ['C₂H₂', 'ацетилен', 3], ['C₆H₆', 'бензол', 3],
  ].map(([q, a, d]) => ({ q, a: L(a, CHEM_EN[q]), d })),
}));
