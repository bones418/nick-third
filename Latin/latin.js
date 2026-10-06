// ---------------------------------------------------------------------------
// Builds every Latin form a lesson covers, and grades English answers.
// Works in the browser (window.LatinGame) and in Node (module.exports) so the
// grading can be tested from the command line.
// ---------------------------------------------------------------------------

(function () {
  // 1st conjugation present tense, as taught in the study guides.
  const PERSONS = [
    { key: "1sg", person: 1, number: "sg", ending: "o", pronoun: "I" },
    { key: "2sg", person: 2, number: "sg", ending: "s", pronoun: "you" },
    { key: "3sg", person: 3, number: "sg", ending: "t", pronoun: "he/she/it" },
    { key: "1pl", person: 1, number: "pl", ending: "mus", pronoun: "we" },
    { key: "2pl", person: 2, number: "pl", ending: "tis", pronoun: "you all" },
    { key: "3pl", person: 3, number: "pl", ending: "nt", pronoun: "they" },
  ];

  // "love" -> "loves", "watch" -> "watches", "look at" -> "looks at"
  function thirdPersonSingular(gloss) {
    const [head, ...rest] = gloss.split(" ");
    let v;
    if (/(s|x|z|ch|sh|o)$/.test(head)) v = head + "es";
    else if (/[^aeiou]y$/.test(head)) v = head.slice(0, -1) + "ies";
    else v = head + "s";
    return [v, ...rest].join(" ");
  }

  function englishFor(p, gloss) {
    return `${p.pronoun} ${p.key === "3sg" ? thirdPersonSingular(gloss) : gloss}`;
  }

  // Every form for the chosen lessons. Each form:
  // { latin, kind: "verb"|"noun", word (dictionary entry), lesson,
  //   number, person (verbs), declension/gender (nouns), answer (display) }
  function buildForms(lessons) {
    const forms = [];
    for (const lesson of lessons) {
      for (const v of lesson.verbs) {
        const stem = v.latin.slice(0, -1) + "a"; // amo -> ama-
        for (const p of PERSONS) {
          forms.push({
            latin: p.key === "1sg" ? v.latin : stem + p.ending,
            kind: "verb", word: v, lesson: lesson.number,
            person: p.person, number: p.number, personKey: p.key,
            ending: "-" + p.ending,
            answer: englishFor(p, v.english[0]),
          });
        }
      }
      for (const n of lesson.nouns) {
        forms.push({
          latin: n.latin, kind: "noun", word: n, lesson: lesson.number,
          number: "sg", declension: n.declension, gender: n.gender,
          answer: n.english[0],
        });
        if (lesson.nounPlurals && !n.proper) {
          forms.push({
            latin: n.latin + "e", kind: "noun", word: n, lesson: lesson.number, // aqua -> aquae
            number: "pl", declension: n.declension, gender: n.gender,
            answer: n.english[0] + "s",
          });
        }
      }
    }
    return forms;
  }

  // ---- grading -------------------------------------------------------------

  // Subject words a kid might type, longest first so "you all" wins over "you".
  const SUBJECTS = [
    [/^(he\s*\/\s*she\s*\/\s*it|he\s*\/\s*she|she\s*\/\s*he|he or she or it|he or she|she or he)\b/, "3sg"],
    [/^(you all|y'?all|you guys|all of you|you two|you \(plural\)|you plural)\b/, "2pl"],
    [/^(i)\b/, "1sg"],
    [/^(we)\b/, "1pl"],
    [/^(you)\b/, "2sg"],
    [/^(he|she|it)\b/, "3sg"],
    [/^(they)\b/, "3pl"],
  ];

  function normalize(s) {
    return s.toLowerCase().replace(/[.,!?;:"]/g, " ").replace(/\s+/g, " ").trim();
  }

  // "loves"/"loving"/"love" -> "lov"; "watches" -> "watch"
  function stemWord(w) {
    w = w.replace(/(ing|es|ed|s)$/, "");
    return w.length > 2 ? w.replace(/e$/, "") : w;
  }
  const stemPhrase = (s) => s.split(" ").filter(Boolean).map(stemWord).join(" ");

  function editDistance(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
    return dp[a.length][b.length];
  }

  // Does the answer text mean one of the glosses? Ignores word endings
  // (love/loves/loving) and allows a one-letter typo on words of 5+ letters (so "play" isn't "pray").
  function meaningMatches(text, glosses) {
    const got = stemPhrase(text);
    if (!got) return false;
    return glosses.some((g) => {
      const want = stemPhrase(g.toLowerCase());
      return got === want || (want.length >= 5 && editDistance(got, want) <= 1);
    });
  }

  function splitSubject(answer) {
    for (const [re, key] of SUBJECTS) {
      const m = answer.match(re);
      if (m) return { subject: key, rest: answer.slice(m[0].length).trim() };
    }
    return { subject: null, rest: answer };
  }

  const PERSON_WORDS = { "1sg": "I", "2sg": "you", "3sg": "he/she/it", "1pl": "we", "2pl": "you all", "3pl": "they" };

  // Returns { correct: bool, note: string, subject } where note explains a
  // near miss or gives a tip, and subject is the person the player typed
  // ("3pl" for "they ...", null if none) so the UI can point at it.
  //   requirePerson: in the endings mode the subject must match the ending;
  //   in the basic mode (dictionary form only) "love" or "I love" both count.
  function grade(answer, form, opts) {
    const result = gradeAnswer(answer, form, opts);
    result.subject = form.kind === "verb" ? splitSubject(normalize(answer)).subject : null;
    return result;
  }

  function gradeAnswer(answer, form, { requirePerson }) {
    const text = normalize(answer);
    if (!text) return { correct: false, note: "" };

    if (form.kind === "noun") {
      const bare = text.replace(/^(the|a|an|some)\s+/, "");
      return { correct: meaningMatches(bare, form.word.english), note: "" };
    }

    let { subject, rest } = splitSubject(text);
    rest = rest.replace(/^(to|am|is|are|do|does)\s+/, "");
    if (!meaningMatches(rest, form.word.english)) {
      return { correct: false, note: "" };
    }

    if (!requirePerson) {
      if (!subject || subject === "1sg") return { correct: true, note: "" };
      return { correct: false, note: `Close! The verb is right, but ${form.latin} means “I …”, not “${PERSON_WORDS[subject]} …”.` };
    }

    if (!subject) {
      if (form.personKey === "1sg") return { correct: true, note: "" };
      return { correct: false, note: `Right verb! Now add who is doing it: the ending ${form.ending} means “${PERSON_WORDS[form.personKey]}”.` };
    }
    if (subject === form.personKey) return { correct: true, note: "" };
    if (subject === "2sg" && form.personKey === "2pl") {
      return { correct: true, note: "Tip: say “you all” to show it's more than one person." };
    }
    return { correct: false, note: `Right verb, but the ending ${form.ending} means “${PERSON_WORDS[form.personKey]}”, not “${PERSON_WORDS[subject]}”.` };
  }

  const LatinGame = { buildForms, grade, PERSONS, PERSON_WORDS };
  if (typeof module !== "undefined" && module.exports) module.exports = LatinGame;
  if (typeof window !== "undefined") window.LatinGame = LatinGame;
})();
