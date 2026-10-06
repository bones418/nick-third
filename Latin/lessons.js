// ---------------------------------------------------------------------------
// Lesson data from the 3rd grade Latin study guides.
//
// To add a lesson, copy a block below and fill it in:
//   verbs: 1st conjugation verbs, given by their "I ___" form (amo). The app
//          builds all six present-tense forms (amo, amas, amat, amamus,
//          amatis, amant) automatically.
//   nouns: declension 1 = -a nouns (aqua), gender "f" or "m".
//   english: accepted meanings; the first one is shown as the answer.
//   nounPlurals: set to true once the guides teach noun plurals
//          (aqua -> aquae), so the endings and grammar modes include them.
// ---------------------------------------------------------------------------

window.LESSONS = [
  {
    number: 1,
    saying: "Ora et labora.",
    sayingMeaning: "Pray and work. (Motto of St. Benedict)",
    nounPlurals: false,
    verbs: [
      { latin: "amo", english: ["love", "like"], derivative: "amateur" },
      { latin: "laboro", english: ["work", "labor"], derivative: "laboratory" },
      { latin: "laudo", english: ["praise"], derivative: "laudable" },
      { latin: "oro", english: ["pray"], derivative: "orator" },
      { latin: "voco", english: ["call"], derivative: "vocal" },
    ],
    nouns: [],
  },
  {
    number: 2,
    saying: "Mater Italiae – Roma.",
    sayingMeaning: "The mother of Italy – Rome.",
    nounPlurals: false,
    verbs: [
      { latin: "navigo", english: ["sail", "navigate"], derivative: "navigate" },
      { latin: "paro", english: ["prepare", "get ready", "make ready"], derivative: "preparation" },
      { latin: "specto", english: ["look at", "watch", "look", "see"], derivative: "spectator" },
    ],
    nouns: [
      { latin: "aqua", english: ["water"], declension: 1, gender: "f", derivative: "aquarium, aqueduct" },
      { latin: "gloria", english: ["glory"], declension: 1, gender: "f", derivative: "glorify, glorious" },
      { latin: "Italia", english: ["Italy"], declension: 1, gender: "f", proper: true },
      { latin: "memoria", english: ["memory"], declension: 1, gender: "f", derivative: "memorial" },
      { latin: "Roma", english: ["Rome"], declension: 1, gender: "f", proper: true, derivative: "romance" },
      { latin: "victoria", english: ["victory", "win"], declension: 1, gender: "f", derivative: "victorious" },
      { latin: "vita", english: ["life"], declension: 1, gender: "f", derivative: "vitamin" },
    ],
  },
];
