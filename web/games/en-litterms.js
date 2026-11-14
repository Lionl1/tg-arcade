// Literary terms for English literature courses (GCSE / AP style): definition → term and back.
(() => {
  const T = {
    device: [
      ['A comparison using “like” or “as”', 'Simile'], ['A comparison that says one thing IS another', 'Metaphor'],
      ['Giving human qualities to non-human things', 'Personification'], ['Deliberate exaggeration for effect', 'Hyperbole'],
      ['Deliberate understatement, often using a negative (“not bad”)', 'Litotes'], ['Two contradictory words placed together (“deafening silence”)', 'Oxymoron'],
      ['Repetition of the same consonant sound at the start of nearby words', 'Alliteration'], ['Repetition of vowel sounds in nearby words', 'Assonance'],
      ['A word that imitates the sound it describes (“buzz”, “crash”)', 'Onomatopoeia'], ['A part used to stand for the whole (“all hands on deck”)', 'Synecdoche'],
      ['Calling something by a closely associated thing (“the Crown” for the monarch)', 'Metonymy'], ['A story whose characters and events stand for abstract ideas', 'Allegory'],
      ['A reference to another work, person or event', 'Allusion'], ['Saying the opposite of what is meant', 'Verbal irony'],
      ['When the audience knows something the characters do not', 'Dramatic irony'], ['Hints about what will happen later in the story', 'Foreshadowing'],
      ['An object or image that represents a wider idea', 'Symbol'], ['Language that appeals to the senses', 'Imagery'],
      ['A gentler word used instead of a harsh one (“passed away”)', 'Euphemism'], ['Placing two contrasting ideas side by side', 'Juxtaposition'],
    ],
    structure: [
      ['Repetition of a word at the start of successive lines or clauses', 'Anaphora'], ['A line of poetry running on into the next without a pause', 'Enjambment'],
      ['A pause in the middle of a line of poetry', 'Caesura'], ['A question asked for effect, not for an answer', 'Rhetorical question'],
      ['A sequence of ideas rising in intensity', 'Gradation'], ['A scene that interrupts the present to show the past', 'Flashback'],
      ['The opening part that introduces characters and setting', 'Exposition'], ['The moment of greatest tension in a story', 'Climax'],
      ['The final part where the conflict is resolved', 'Resolution (dénouement)'], ['A section after the main story telling what happened next', 'Epilogue'],
      ['A long speech by one character, often alone on stage, revealing thoughts', 'Soliloquy'], ['A remark to the audience that other characters do not hear', 'Aside'],
      ['Written instructions in a play about action or setting', 'Stage directions'], ['A recurring idea, image or symbol in a work', 'Motif'],
    ],
    verse: [
      ['A unit of two syllables: unstressed, stressed (da-DUM)', 'Iamb'], ['A unit of two syllables: stressed, unstressed (DUM-da)', 'Trochee'],
      ['A line of five iambs', 'Iambic pentameter'], ['Unrhymed iambic pentameter', 'Blank verse'], ['Poetry with no regular rhyme or metre', 'Free verse'],
      ['A 14-line poem with a set rhyme scheme', 'Sonnet'], ['Two consecutive rhyming lines', 'Rhyming couplet'], ['A four-line stanza', 'Quatrain'],
      ['A poem that tells a story, often in short stanzas', 'Ballad'], ['A poem of mourning for someone who has died', 'Elegy'],
      ['A formal poem addressing and praising its subject', 'Ode'], ['A three-line Japanese poem of 5–7–5 syllables', 'Haiku'],
    ],
    genre: [
      ['A play in which the hero falls because of a fatal flaw', 'Tragedy'], ['The fatal flaw of a tragic hero', 'Hamartia'],
      ['Excessive pride that leads to a downfall', 'Hubris'], ['A story set in an imagined, often oppressive future society', 'Dystopia'],
      ['A novel written as a series of letters', 'Epistolary novel'], ['A story of a young person growing up and maturing', 'Bildungsroman'],
      ['Writing that ridicules people or society to expose faults', 'Satire'], ['Fiction with gloom, horror and mysterious old buildings', 'Gothic fiction'],
      ['A narrator whose account cannot be fully trusted', 'Unreliable narrator'], ['A narrator who knows the thoughts of all characters', 'Omniscient narrator'],
      ['A narrative showing a character’s flowing thoughts', 'Stream of consciousness'], ['The main character of a story', 'Protagonist'],
      ['The character who opposes the main character', 'Antagonist'], ['A character who contrasts with another to highlight their qualities', 'Foil'],
    ],
    movement: [
      ['Late 18th–19th c.: emotion, nature, imagination (Wordsworth, Keats)', 'Romanticism'],
      ['19th c.: ordinary life shown truthfully (Eliot, Tolstoy)', 'Realism'],
      ['Early 20th c.: experiment, fragmentation, inner life (Woolf, Joyce)', 'Modernism'],
      ['17th–18th c.: order, reason and classical models (Pope, Dryden)', 'Neoclassicism'],
      ['Late 20th c.: irony, playfulness, mixing of styles', 'Postmodernism'],
      ['1920s African American cultural movement (Hughes, Hurston)', 'Harlem Renaissance'],
    ],
  };
  const D = { device: 1, structure: 2, verse: 2, genre: 2, movement: 3 };
  Arcade.register(Learn.deck({
    ask: 'Which term is this?',
    askRev: 'What does the term mean?',
    both: true,
    rule: 'Literary terms you need for English literature exams: devices, structure, verse, genre and movements.',
    cards: Object.entries(T).flatMap(([g, list]) => list.map(([q, a]) => ({ q, a, g, d: D[g] }))),
  }));
})();
