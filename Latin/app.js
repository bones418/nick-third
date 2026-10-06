// ---------------------------------------------------------------------------
// 3rd grade Latin practice. Three games, 10 questions per round:
//   basic    - dictionary form (amo, aqua) -> type the English
//   endings  - any form the lessons teach (amant) -> "they love"
//   grammar  - pick singular/plural, plus person (verbs) or
//              declension + gender (nouns); answers shown in green/red
// Word data lives in lessons.js; form building and grading in latin.js.
// ---------------------------------------------------------------------------

const ROUND_LENGTH = 10;
const LS_LESSONS_KEY = "nick_latin_lessons_v1";

const $ = (id) => document.getElementById(id);

let selectedLessons = new Set();
let round = null;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const ordinal = (n) => ({ 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" }[n]);
const NUMBER_LABEL = { sg: "Singular", pl: "Plural" };
const GENDER_LABEL = { m: "Masculine", f: "Feminine" };

// ---- menu --------------------------------------------------------------------

function chosenLessons() {
  return window.LESSONS.filter((l) => selectedLessons.has(l.number));
}

function poolFor(mode) {
  const forms = LatinGame.buildForms(chosenLessons());
  // the basic game only uses dictionary forms (amo, aqua)
  if (mode === "basic") return forms.filter((f) => f.kind === "noun" ? f.number === "sg" : f.personKey === "1sg");
  return forms;
}

function renderMenu() {
  $("lesson-list").innerHTML = window.LESSONS.map((l) => {
    const words = [...l.verbs, ...l.nouns].map((w) => w.latin).join(", ");
    return `
      <button class="lesson${selectedLessons.has(l.number) ? " on" : ""}" data-lesson="${l.number}">
        <div class="check">✓</div>
        <div>
          <div class="lesson-title">Lesson ${l.number}</div>
          <div class="saying">“${escapeHtml(l.saying)}”</div>
          <div class="saying-meaning">${escapeHtml(l.sayingMeaning)}</div>
          <div class="lesson-words">${escapeHtml(words)}</div>
        </div>
      </button>`;
  }).join("");
  document.querySelectorAll(".lesson").forEach((btn) => {
    btn.onclick = () => {
      const n = Number(btn.dataset.lesson);
      if (selectedLessons.has(n)) selectedLessons.delete(n); else selectedLessons.add(n);
      try { localStorage.setItem(LS_LESSONS_KEY, JSON.stringify([...selectedLessons])); } catch (e) { /* ignore */ }
      renderMenu();
    };
  });
  document.querySelectorAll(".mode").forEach((btn) => {
    btn.disabled = poolFor(btn.dataset.mode).length === 0;
  });
}

function showScreen(id) {
  ["menu", "quiz", "summary"].forEach((s) => { $(s).style.display = s === id ? "block" : "none"; });
}

// ---- rounds ------------------------------------------------------------------

function startRound(mode) {
  const pool = poolFor(mode);
  // Deal from shuffled copies of the pool so words don't repeat until all
  // have been seen.
  let deck = [];
  while (deck.length < ROUND_LENGTH) deck = deck.concat(shuffle(pool));
  round = { mode, questions: deck.slice(0, ROUND_LENGTH), index: 0, score: 0, missed: [] };
  showScreen("quiz");
  showQuestion();
}

function updateTopbar() {
  $("score").textContent = round.score;
  $("progress-bar").style.width = `${(round.index / ROUND_LENGTH) * 100}%`;
}

function showQuestion() {
  updateTopbar();
  const form = round.questions[round.index];
  if (round.mode === "grammar") renderGrammarQuestion(form);
  else renderTypingQuestion(form);
}

function nextQuestion() {
  round.index++;
  if (round.index >= ROUND_LENGTH) showSummary();
  else showQuestion();
}

function record(correct, form) {
  if (correct) round.score++;
  else round.missed.push(form);
  updateTopbar();
}

function derivativeLine(form) {
  return form.word.derivative ? `<div class="extra">English word from it: <b>${escapeHtml(form.word.derivative)}</b></div>` : "";
}

// Result shown under the question: a big colored verdict, then a green/red
// box with the correct answer (plus whatever extra the game adds).
function feedbackHtml(correct, answerHtml, { typed, note, extraHtml, form }) {
  return `
    <div class="verdict ${correct ? "good" : "bad"}">${correct ? "✓ Correct!" : "✗ Not quite"}</div>
    <div class="feedback ${correct ? "good" : "bad"}">
      <div class="answer-label">${correct ? "Answer" : "The correct answer is"}</div>
      <div class="answer">${answerHtml}</div>
      ${typed && !correct ? `<div class="yours">You wrote: <span>${escapeHtml(typed)}</span></div>` : ""}
      ${note ? `<div class="note">${escapeHtml(note)}</div>` : ""}
      ${extraHtml || ""}
      ${derivativeLine(form)}
    </div>
    <button class="btn big" id="next-btn">${round.index + 1 >= ROUND_LENGTH ? "See my score" : "Next →"}</button>`;
}

function wireNext() {
  const next = $("next-btn");
  const shownAt = performance.now();
  next.focus();
  // Ignore a click in the first moment, so a held-down Enter key can't skip
  // past the answer before it's been seen.
  next.onclick = () => { if (performance.now() - shownAt > 400) nextQuestion(); };
}

// "amat" -> am<span>at</span>, so the ending stands out
function latinWithEnding(form) {
  if (form.kind !== "verb") return escapeHtml(form.latin);
  const end = form.ending.slice(1);
  const stem = form.latin.slice(0, form.latin.length - end.length);
  return `${escapeHtml(stem)}<span class="ending">${escapeHtml(end)}</span>`;
}

// The study-guide chart for this verb, with the right row in green and the
// person the player typed (if different) in red.
function conjugationChart(form, typedSubject) {
  const forms = LatinGame.buildForms(chosenLessons()).filter((f) => f.word === form.word);
  const cell = (key) => {
    const f = forms.find((x) => x.personKey === key);
    const cls = key === form.personKey ? "right" : key === typedSubject ? "wrong" : "";
    return `<td class="${cls}"><b>${latinWithEnding(f)}</b><br>${escapeHtml(f.answer)}</td>`;
  };
  return `
    <table class="chart">
      <tr><th></th><th>Singular</th><th>Plural</th></tr>
      <tr><th>1st</th>${cell("1sg")}${cell("1pl")}</tr>
      <tr><th>2nd</th>${cell("2sg")}${cell("2pl")}</tr>
      <tr><th>3rd</th>${cell("3sg")}${cell("3pl")}</tr>
    </table>`;
}

// ---- typing games (basic + endings) -----------------------------------------------

function renderTypingQuestion(form) {
  $("question").innerHTML = `
    <div class="prompt">
      <div class="prompt-label">What does this mean?</div>
      <div class="latin-word" id="latin-word">${escapeHtml(form.latin)}</div>
      <input class="answer-input" id="answer" autocomplete="off" autocapitalize="off" spellcheck="false"
             placeholder="Type it in English">
      <div><button class="btn" id="check-btn">Check</button></div>
      <div id="feedback"></div>
    </div>`;
  const input = $("answer");
  input.focus();
  const submit = () => {
    if (input.disabled || !input.value.trim()) return;
    const typed = input.value.trim();
    const { correct, note, subject } = LatinGame.grade(typed, form, { requirePerson: round.mode === "endings" });
    record(correct, form);
    const showChart = round.mode === "endings" && form.kind === "verb";
    input.disabled = true;
    input.classList.add(correct ? "good" : "bad");
    $("check-btn").style.display = "none";
    if (showChart) $("latin-word").innerHTML = latinWithEnding(form);
    $("feedback").innerHTML = feedbackHtml(correct, `${showChart ? latinWithEnding(form) : escapeHtml(form.latin)} = ${escapeHtml(form.answer)}`, {
      typed, note, form,
      extraHtml: showChart ? conjugationChart(form, correct ? null : subject) : "",
    });
    wireNext();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    // Without this, the same Enter press "clicks" the Next button that
    // appears, skipping straight past the answer.
    e.preventDefault();
    submit();
  });
  $("check-btn").onclick = submit;
}

// ---- grammar detective -----------------------------------------------------------

// The questions asked depend on the word: verbs have number + person; nouns
// have number + declension + gender. Only declensions from the chosen
// lessons are offered.
function grammarGroups(form) {
  const groups = [{ key: "number", label: "Singular or plural?", options: ["sg", "pl"].map((v) => [v, NUMBER_LABEL[v]]), answer: form.number }];
  if (form.kind === "verb") {
    groups.push({ key: "person", label: "Which person?", options: [1, 2, 3].map((v) => [String(v), `${ordinal(v)} person`]), answer: String(form.person) });
  } else {
    const declensions = [...new Set(chosenLessons().flatMap((l) => l.nouns.map((n) => n.declension)))].sort();
    groups.push({ key: "declension", label: "Which declension?", options: declensions.map((d) => [String(d), `${ordinal(d)} declension`]), answer: String(form.declension) });
    groups.push({ key: "gender", label: "Masculine or feminine?", options: ["m", "f"].map((v) => [v, GENDER_LABEL[v]]), answer: form.gender });
  }
  return groups;
}

function grammarAnswerText(form) {
  if (form.kind === "verb") {
    return `${NUMBER_LABEL[form.number]}, ${ordinal(form.person)} person — verb: “${form.answer}”`;
  }
  return `${NUMBER_LABEL[form.number]}, ${ordinal(form.declension)} declension, ${GENDER_LABEL[form.gender]} — noun: “${form.answer}”`;
}

function renderGrammarQuestion(form) {
  const groups = grammarGroups(form);
  const picks = {};
  $("question").innerHTML = `
    <div class="prompt">
      <div class="prompt-label">Be a grammar detective!</div>
      <div class="latin-word">${escapeHtml(form.latin)}</div>
      ${groups.map((g) => `
        <div class="group">
          <div class="group-label">${g.label}</div>
          <div class="options">
            ${g.options.map(([v, label]) => `<button class="opt" data-group="${g.key}" data-value="${v}">${label}</button>`).join("")}
          </div>
        </div>`).join("")}
      <div><button class="btn" id="check-btn" disabled>Check</button></div>
      <div id="feedback"></div>
    </div>`;

  document.querySelectorAll(".opt").forEach((btn) => {
    btn.onclick = () => {
      if (btn.disabled) return;
      const g = btn.dataset.group;
      document.querySelectorAll(`.opt[data-group="${g}"]`).forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      picks[g] = btn.dataset.value;
      $("check-btn").disabled = groups.some((gr) => !picks[gr.key]);
    };
  });

  $("check-btn").onclick = () => {
    let allRight = true;
    for (const g of groups) {
      if (picks[g.key] !== g.answer) allRight = false;
      document.querySelectorAll(`.opt[data-group="${g.key}"]`).forEach((b) => {
        b.disabled = true;
        b.classList.remove("selected");
        const isAnswer = b.dataset.value === g.answer;
        const isPick = b.dataset.value === picks[g.key];
        if (isAnswer && isPick) b.classList.add("right");
        else if (isPick) b.classList.add("wrong");
        else if (isAnswer) b.classList.add("missed");
      });
    }
    $("check-btn").style.display = "none";
    record(allRight, form);
    $("feedback").innerHTML = feedbackHtml(allRight, `${escapeHtml(form.latin)}: ${escapeHtml(grammarAnswerText(form))}`, { form });
    wireNext();
  };
}

// ---- summary --------------------------------------------------------------------

function showSummary() {
  round.index = ROUND_LENGTH;
  updateTopbar();
  const s = round.score;
  const stars = s >= 10 ? 3 : s >= 8 ? 2 : s >= 5 ? 1 : 0;
  const cheer = ["Keep practicing — you'll get it!", "Good work!", "Great job!", "Perfect! Optime! 🎉"][stars];
  const missed = [...new Map(round.missed.map((f) => [f.latin, f])).values()];
  $("summary-card").innerHTML = `
    <div class="stars">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</div>
    <div class="big-score">${s} / ${ROUND_LENGTH}</div>
    <p>${cheer}</p>
    ${missed.length ? `<div class="review"><b>Words to practice:</b>
      ${missed.map((f) => `<div><b>${escapeHtml(f.latin)}</b> = ${escapeHtml(f.answer)}</div>`).join("")}</div>` : ""}
    <div class="actions">
      <button class="btn" id="again-btn">Play again</button>
      <button class="btn secondary" id="menu-btn">Menu</button>
    </div>`;
  showScreen("summary");
  $("again-btn").focus();
  $("again-btn").onclick = () => startRound(round.mode);
  $("menu-btn").onclick = () => { showScreen("menu"); renderMenu(); };
}

// ---- boot -----------------------------------------------------------------------

window.addEventListener("DOMContentLoaded", () => {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(LS_LESSONS_KEY)); } catch (e) { /* ignore */ }
  const valid = (saved || []).filter((n) => window.LESSONS.some((l) => l.number === n));
  selectedLessons = new Set(valid.length ? valid : window.LESSONS.map((l) => l.number));
  renderMenu();
  document.querySelectorAll(".mode").forEach((btn) => { btn.onclick = () => startRound(btn.dataset.mode); });
  $("quit-btn").onclick = () => { showScreen("menu"); renderMenu(); };
});
