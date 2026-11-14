// ЕГЭ обществознание: понятийный аппарат (задания 1–2). Определение → термин и обратно; неверные варианты — из того же блока.
(() => {
  const T = {
    man: [
      ['Обособившаяся от природы часть мира, включающая способы взаимодействия людей', 'Общество', "The part of the world set apart from nature, including the ways people interact", "Society"],
      ['Устойчивая форма организации совместной деятельности людей (семья, школа, государство)', 'Социальный институт', "A stable form of organising joint activity (family, school, the state)", "Social institution"],
      ['Поступательное развитие от простого к сложному, от менее совершенного к более совершенному', 'Прогресс', "Forward development from simple to complex, from less to more perfect", "Progress"],
      ['Движение назад, от более совершенного к менее совершенному', 'Регресс', "Movement backwards, from more perfect to less perfect", "Regression"],
      ['Постепенное преобразование, проводимое по инициативе власти', 'Реформа', "Gradual change carried out on the initiative of the authorities", "Reform"], ['Коренной, быстрый переворот в жизни общества', 'Революция', "A fundamental, rapid upheaval in the life of society", "Revolution"],
      ['Процесс превращения мира в единую взаимосвязанную систему', 'Глобализация', "The process of the world becoming a single interconnected system", "Globalisation"], ['Система взглядов человека на мир и своё место в нём', 'Мировоззрение', "A person's system of views on the world and their place in it", "Worldview"],
      ['Осознанная активность человека, направленная на достижение цели', 'Деятельность', "Conscious human activity aimed at a goal", "Activity"], ['Нужда человека в том, что необходимо для жизни и развития', 'Потребность', "A person's need for what is necessary for life and development", "Need"],
      ['Человек как общественное существо, обладающее социально значимыми качествами', 'Личность', "A human being as a social being with socially significant qualities", "Personality"], ['Неповторимое своеобразие человека', 'Индивидуальность', "The unique character of a person", "Individuality"],
      ['Процесс усвоения человеком норм, ценностей и ролей общества', 'Социализация', "The process of learning a society's norms, values and roles", "Socialisation"],
    ],
    eco: [
      ['Количество товара, которое покупатели готовы купить по данной цене', 'Спрос', "The amount of a good buyers are willing to buy at a given price", "Demand"], ['Количество товара, которое продавцы готовы продать по данной цене', 'Предложение', "The amount of a good sellers are willing to sell at a given price", "Supply"],
      ['Устойчивый рост общего уровня цен', 'Инфляция', "A sustained rise in the general price level", "Inflation"], ['Снижение общего уровня цен', 'Дефляция', "A fall in the general price level", "Deflation"],
      ['Рыночная стоимость всех конечных товаров и услуг, произведённых в стране за год', 'ВВП', "The market value of all final goods and services produced in a country in a year", "GDP"],
      ['Рынок, где господствует один продавец', 'Монополия', "A market dominated by a single seller", "Monopoly"], ['Рынок, где господствуют несколько крупных фирм', 'Олигополия', "A market dominated by a few large firms", "Oligopoly"],
      ['Ценная бумага, дающая право на часть прибыли и участие в управлении компанией', 'Акция', "A security giving a share of profit and a say in running a company", "Share (stock)"],
      ['Долговая ценная бумага: заём с обязательством вернуть сумму с процентом', 'Облигация', "A debt security: a loan repaid with interest", "Bond"], ['Часть прибыли, выплачиваемая владельцам акций', 'Дивиденд', "The part of profit paid to shareholders", "Dividend"],
      ['Превышение доходов бюджета над расходами', 'Профицит бюджета', "Budget revenue exceeding spending", "Budget surplus"], ['Превышение расходов бюджета над доходами', 'Дефицит бюджета', "Budget spending exceeding revenue", "Budget deficit"],
      ['Обязательный безвозмездный платёж в пользу государства', 'Налог', "A compulsory payment to the state with nothing given directly in return", "Tax"], ['Доход от фактора производства «земля»', 'Рента', "Income from the factor of production “land”", "Rent"],
      ['Затраты фирмы на производство продукции', 'Издержки', "A firm's spending on producing its output", "Costs"], ['Безработица из-за спада в экономике', 'Циклическая безработица', "Unemployment caused by an economic downturn", "Cyclical unemployment"],
      ['Безработица из-за изменения структуры экономики и исчезновения профессий', 'Структурная безработица', "Unemployment caused by changes in the structure of the economy and disappearing jobs", "Structural unemployment"],
      ['Безработица на время поиска новой работы', 'Фрикционная безработица', "Unemployment during the search for a new job", "Frictional unemployment"],
    ],
    pol: [
      ['Способность и возможность влиять на поведение людей', 'Власть', "The ability and capacity to influence people's behaviour", "Power"], ['Независимость государства во внешних и верховенство во внутренних делах', 'Суверенитет', "A state's independence abroad and supremacy at home", "Sovereignty"],
      ['Режим, при котором источник власти — народ, а права граждан защищены', 'Демократия', "A regime in which the people are the source of power and citizens' rights are protected", "Democracy"],
      ['Режим полного контроля государства над всеми сферами жизни', 'Тоталитаризм', "A regime of total state control over every sphere of life", "Totalitarianism"],
      ['Режим концентрации власти у одного лица или группы при невмешательстве в частную жизнь', 'Авторитаризм', "A regime concentrating power in one person or group while leaving private life alone", "Authoritarianism"],
      ['Форма правления, при которой власть передаётся по наследству', 'Монархия', "A form of government in which power is inherited", "Monarchy"], ['Форма правления, при которой органы власти избираются на срок', 'Республика', "A form of government in which authorities are elected for a term", "Republic"],
      ['Государство из субъектов, обладающих определённой самостоятельностью', 'Федерация', "A state made of units with a certain independence", "Federation"], ['Государство, части которого не имеют самостоятельности', 'Унитарное государство', "A state whose parts have no self-government of their own", "Unitary state"],
      ['Союз суверенных государств для достижения общих целей', 'Конфедерация', "A union of sovereign states pursuing common goals", "Confederation"], ['Всенародное голосование по важнейшим вопросам', 'Референдум', "A nationwide vote on a key question", "Referendum"],
      ['Процедура отрешения от должности главы государства', 'Импичмент', "The procedure for removing a head of state from office", "Impeachment"],
      ['Сфера добровольных объединений граждан, независимых от государства', 'Гражданское общество', "The sphere of voluntary citizens' associations independent of the state", "Civil society"],
      ['Государство, где власть ограничена правом и обеспечено разделение властей', 'Правовое государство', "A state where power is limited by law and the separation of powers is ensured", "Rule of law"],
    ],
    law: [
      ['Способность иметь права и обязанности', 'Правоспособность', "The capacity to have rights and duties", "Legal capacity"], ['Способность своими действиями приобретать права и исполнять обязанности', 'Дееспособность', "The capacity to acquire rights and fulfil duties by one's own actions", "Legal competence"],
      ['Виновное противоправное деяние дееспособного лица', 'Правонарушение', "A culpable unlawful act by a legally competent person", "Offence"], ['Общественно опасное деяние, запрещённое Уголовным кодексом', 'Преступление', "A socially dangerous act prohibited by criminal law", "Crime"],
      ['Правонарушение, менее опасное, чем преступление', 'Проступок', "An offence less dangerous than a crime", "Misdemeanour"],
      ['Обвиняемый считается невиновным, пока его вина не доказана судом', 'Презумпция невиновности', "The accused is innocent until proven guilty in court", "Presumption of innocence"],
      ['Основной закон государства с высшей юридической силой', 'Конституция', "The basic law of a state with the highest legal force", "Constitution"], ['Часть нормы права, указывающая последствия её нарушения', 'Санкция', "The part of a legal rule stating the consequences of breaking it", "Sanction"],
    ],
    soc: [
      ['Перемещение человека или группы в социальной структуре', 'Социальная мобильность', "A person's or group's movement within the social structure", "Social mobility"], ['Деление общества на слои по неравенству', 'Социальная стратификация', "The division of society into layers by inequality", "Social stratification"],
      ['Человек, оказавшийся между социальными группами', 'Маргинал', "A person caught between social groups", "Marginal person"], ['Поведение, отклоняющееся от принятых в обществе норм', 'Девиантное поведение', "Behaviour that departs from society's accepted norms", "Deviant behaviour"],
      ['Совокупность людей с общей культурой, языком и самосознанием', 'Этнос', "A community of people with a shared culture, language and identity", "Ethnic group"], ['Малая группа, основанная на браке или кровном родстве', 'Семья', "A small group based on marriage or kinship", "Family"],
    ],
  };
  const D = { man: 1, eco: 2, pol: 2, law: 3, soc: 3 };
  Arcade.register(Learn.deck({
    ask: L('Какой это термин?', 'Which term is this?'),
    askRev: L('Что означает термин?', 'What does the term mean?'),
    both: true,
    rule: L('Понятия обществознания: человек и общество, экономика, политика, право, социальная сфера. Неверные варианты — из того же блока.',
      'Key terms of civics and economics: society, economy, politics, law and social structure. Wrong options come from the same block.'),
    cards: Object.entries(T).flatMap(([g, list]) => list.map(([q, a, qe, ae]) => ({ q: L(q, qe), a: L(a, ae), g, d: D[g] }))),
  }));
})();
