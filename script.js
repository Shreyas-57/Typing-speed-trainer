const paragraphs = [
  "Small improvements feel boring until they stack into something impressive. Keep your hands relaxed, your eyes ahead, and let rhythm do the heavy lifting.",
  "Typing faster is useful, but typing accurately is what saves time. Clean muscle memory beats frantic speed every single day.",
  "A good practice session is not about perfection. It is about noticing mistakes early, correcting them calmly, and building consistency over time.",
  "Designing software teaches patience because even simple ideas need careful details. Clear feedback, smooth interactions, and readable text make tools feel better.",
  "Momentum grows when a project responds instantly. Fast feedback helps you stay focused, spot patterns, and improve without guessing what went wrong.",
  "Practice with intention. When you slow down enough to notice weak letters, those weak spots eventually become reliable habits.",
];

const codeSnippets = [
  "const score = results.filter((item) => item.correct).length;",
  "function formatSpeed(wpm) { return `${Math.max(0, wpm)} WPM`; }",
  "if (accuracy < 90) { console.log('Focus on precision first.'); }",
  "for (let i = 0; i < chars.length; i += 1) { total += chars[i]; }",
];

const practiceSets = {
  numbers: "48291 70654 19382 55017 26480 91837 40516 77124 60938 15204",
  symbols: "! @ # $ % ^ & * ( ) _ + - = { } [ ] ; : < > ? / \\ | ~ `",
};

const historyKey = "pulse-type-history";
const weakKeysStorageKey = "pulse-type-weak-keys";

const textDisplay = document.getElementById("textDisplay");
const typingInput = document.getElementById("typingInput");
const timeLeftEl = document.getElementById("timeLeft");
const wpmEl = document.getElementById("wpm");
const accuracyEl = document.getElementById("accuracy");
const mistakesEl = document.getElementById("mistakes");
const restartBtn = document.getElementById("restartBtn");
const newTextBtn = document.getElementById("newTextBtn");
const practiceMode = document.getElementById("practiceMode");
const timerOptions = document.getElementById("timerOptions");
const historyList = document.getElementById("historyList");
const weakKeysList = document.getElementById("weakKeysList");
const themeToggle = document.getElementById("themeToggle");

let selectedTime = 30;
let timeLeft = selectedTime;
let timerId = null;
let hasStarted = false;
let sessionFinished = false;
let currentText = "";
let currentMistakes = 0;
let weakKeyBuffer = loadWeakKeyMap();

function loadWeakKeyMap() {
  try {
    const saved = JSON.parse(localStorage.getItem(weakKeysStorageKey));
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveWeakKeyMap() {
  localStorage.setItem(weakKeysStorageKey, JSON.stringify(weakKeyBuffer));
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 8)));
}

function sample(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function buildWeakKeyText() {
  const sortedWeakKeys = Object.entries(weakKeyBuffer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key]) => key);

  if (!sortedWeakKeys.length) {
    return "focus flow focus flow calm speed sharp keys clean reps steady hands";
  }

  return Array.from({ length: 18 }, (_, index) => sortedWeakKeys[index % sortedWeakKeys.length]).join(" ");
}

function getPracticeText() {
  switch (practiceMode.value) {
    case "numbers":
      return practiceSets.numbers;
    case "symbols":
      return practiceSets.symbols;
    case "code":
      return sample(codeSnippets);
    case "weak":
      return buildWeakKeyText();
    case "paragraph":
    default:
      return sample(paragraphs);
  }
}

function renderText() {
  textDisplay.innerHTML = "";
  currentText.split("").forEach((char, index) => {
    const span = document.createElement("span");
    span.innerText = char;
    if (index === 0) {
      span.classList.add("current");
    }
    textDisplay.appendChild(span);
  });
}

function updateStats() {
  const typedText = typingInput.value;
  const elapsedSeconds = selectedTime - timeLeft;
  const typedChars = typedText.length;
  const correctChars = typedText.split("").filter((char, index) => char === currentText[index]).length;
  const minutes = Math.max(elapsedSeconds, 1) / 60;
  const wpm = Math.round((correctChars / 5) / minutes);
  const accuracy = typedChars === 0 ? 100 : Math.round((correctChars / typedChars) * 100);

  wpmEl.textContent = Number.isFinite(wpm) ? Math.max(wpm, 0) : 0;
  accuracyEl.textContent = `${Math.max(accuracy, 0)}%`;
  mistakesEl.textContent = currentMistakes;
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = "";

  if (!history.length) {
    historyList.innerHTML = "<li>No sessions saved yet.</li>";
    return;
  }

  history.forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${entry.wpm} WPM</strong>
      <div class="history-meta">
        <span>${entry.accuracy}% accuracy</span>
        <span>${entry.date}</span>
      </div>
    `;
    historyList.appendChild(item);
  });
}

function renderWeakKeys() {
  const ranked = Object.entries(weakKeyBuffer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  weakKeysList.innerHTML = "";

  if (!ranked.length) {
    weakKeysList.innerHTML = "<li>No weak keys yet. Finish a round to analyze them.</li>";
    return;
  }

  ranked.forEach(([key, count]) => {
    const item = document.createElement("li");
    const displayKey = key === " " ? "space" : key;
    item.innerHTML = `<span class="weak-key-pill">${displayKey}</span> missed ${count} time${count > 1 ? "s" : ""}`;
    weakKeysList.appendChild(item);
  });
}

function recordWeakKeys() {
  const typedChars = typingInput.value.split("");
  typedChars.forEach((char, index) => {
    const expected = currentText[index];
    if (expected && char !== expected) {
      weakKeyBuffer[expected] = (weakKeyBuffer[expected] || 0) + 1;
    }
  });
  saveWeakKeyMap();
}

function endSession() {
  if (sessionFinished) {
    return;
  }

  sessionFinished = true;
  clearInterval(timerId);
  timerId = null;
  timeLeft = 0;
  timeLeftEl.textContent = "0";
  typingInput.disabled = true;
  updateStats();
  recordWeakKeys();
  renderWeakKeys();

  const result = {
    wpm: wpmEl.textContent,
    accuracy: accuracyEl.textContent.replace("%", ""),
    date: new Date().toLocaleDateString([], { month: "short", day: "numeric" }),
  };

  saveHistory(result);
  renderHistory();
}

function tickTimer() {
  if (timeLeft <= 1) {
    endSession();
    return;
  }

  timeLeft -= 1;
  timeLeftEl.textContent = String(timeLeft);
  updateStats();
}

function startTimer() {
  if (hasStarted) {
    return;
  }

  hasStarted = true;
  timerId = setInterval(tickTimer, 1000);
}

function updateHighlights() {
  const chars = textDisplay.querySelectorAll("span");
  const typedChars = typingInput.value.split("");
  let mistakes = 0;

  chars.forEach((span, index) => {
    span.classList.remove("correct", "incorrect", "current");

    const typedChar = typedChars[index];
    if (typedChar == null) {
      if (index === typedChars.length) {
        span.classList.add("current");
      }
      return;
    }

    if (typedChar === currentText[index]) {
      span.classList.add("correct");
    } else {
      span.classList.add("incorrect");
      mistakes += 1;
    }
  });

  currentMistakes = mistakes;
  updateStats();

  if (typingInput.value.length >= currentText.length) {
    endSession();
  }
}

function resetSession({ preserveText = false } = {}) {
  clearInterval(timerId);
  timerId = null;
  hasStarted = false;
  sessionFinished = false;
  timeLeft = selectedTime;
  currentMistakes = 0;
  typingInput.disabled = false;
  typingInput.value = "";
  timeLeftEl.textContent = String(selectedTime);

  if (!preserveText) {
    currentText = getPracticeText();
  }

  renderText();
  updateStats();
  typingInput.focus();
}

function setTime(seconds) {
  selectedTime = seconds;
  Array.from(timerOptions.querySelectorAll(".chip")).forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.time) === seconds);
  });
  resetSession({ preserveText: false });
}

function toggleTheme() {
  const isDark = document.body.dataset.theme === "dark";
  document.body.dataset.theme = isDark ? "light" : "dark";
  themeToggle.querySelector("span:last-child").textContent = isDark ? "Switch to dark" : "Switch to light";
  themeToggle.querySelector(".theme-toggle__icon").textContent = isDark ? "L" : "D";
}

typingInput.addEventListener("input", () => {
  if (!hasStarted && typingInput.value.length > 0) {
    startTimer();
  }
  updateHighlights();
});

restartBtn.addEventListener("click", () => resetSession({ preserveText: true }));
newTextBtn.addEventListener("click", () => resetSession({ preserveText: false }));
practiceMode.addEventListener("change", () => resetSession({ preserveText: false }));
themeToggle.addEventListener("click", toggleTheme);

timerOptions.addEventListener("click", (event) => {
  const button = event.target.closest(".chip");
  if (!button) {
    return;
  }
  setTime(Number(button.dataset.time));
});

renderHistory();
renderWeakKeys();
resetSession();
