// Which book is the character from? Famous characters of English-language and world literature.
Arcade.register(Learn.deck({
  ask: 'Which work is the character from?',
  cards: [
    ['Elizabeth Bennet', 'Pride and Prejudice', 1], ['Mr Darcy', 'Pride and Prejudice', 1], ['Jay Gatsby', 'The Great Gatsby', 1], ['Atticus Finch', 'To Kill a Mockingbird', 1],
    ['Scout Finch', 'To Kill a Mockingbird', 1], ['Holden Caulfield', 'The Catcher in the Rye', 1], ['Ebenezer Scrooge', 'A Christmas Carol', 1], ['Pip', 'Great Expectations', 1],
    ['Miss Havisham', 'Great Expectations', 2], ['Heathcliff', 'Wuthering Heights', 1], ['Mr Rochester', 'Jane Eyre', 2], ['Winston Smith', 'Nineteen Eighty-Four', 1],
    ['Big Brother', 'Nineteen Eighty-Four', 1], ['Napoleon the pig', 'Animal Farm', 1], ['Boxer the horse', 'Animal Farm', 2], ['Ralph and Piggy', 'Lord of the Flies', 1],
    ['George and Lennie', 'Of Mice and Men', 1], ['Captain Ahab', 'Moby-Dick', 1], ['Hester Prynne', 'The Scarlet Letter', 2], ['Huck Finn and Jim', 'The Adventures of Huckleberry Finn', 1],
    ['Victor Frankenstein', 'Frankenstein', 1], ['Count Dracula', 'Dracula', 1], ['Dorian Gray', 'The Picture of Dorian Gray', 1], ['Gandalf', 'The Lord of the Rings', 1],
    ['Bilbo Baggins', 'The Hobbit', 1], ['Long John Silver', 'Treasure Island', 2], ['Lady Macbeth', 'Macbeth', 1], ['Ophelia', 'Hamlet', 2], ['Iago', 'Othello', 2],
    ['Puck', 'A Midsummer Night’s Dream', 2], ['Inspector Goole', 'An Inspector Calls', 2], ['Guy Montag', 'Fahrenheit 451', 2], ['Offred', 'The Handmaid’s Tale', 2],
    ['Santiago the fisherman', 'The Old Man and the Sea', 2], ['Willy Loman', 'Death of a Salesman', 2], ['Blanche DuBois', 'A Streetcar Named Desire', 3],
    ['Jo March', 'Little Women', 1], ['Clarissa Dalloway', 'Mrs Dalloway', 3], ['Leopold Bloom', 'Ulysses', 3], ['Kurtz', 'Heart of Darkness', 3],
    ['Okonkwo', 'Things Fall Apart', 3], ['Jean Valjean', 'Les Misérables', 1], ['Edmond Dantès', 'The Count of Monte Cristo', 2], ['Emma Bovary', 'Madame Bovary', 3],
    ['Raskolnikov', 'Crime and Punishment', 1], ['Natasha Rostova', 'War and Peace', 2], ['Gregor Samsa', 'The Metamorphosis', 2], ['Odysseus', 'The Odyssey', 1],
    ['Don Quixote and Sancho Panza', 'Don Quixote', 1], ['Lemuel Gulliver', 'Gulliver’s Travels', 1], ['Tess Durbeyfield', 'Tess of the d’Urbervilles', 3], ['Dorothea Brooke', 'Middlemarch', 3],
  ].map(([q, a, d]) => ({ q, a: `“${a}”`, d })),
}));
