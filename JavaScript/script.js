// ---------- State ----------
const STORAGE_KEY = "focusCoachState";

const defaultState = {
  name: "",
  completed: 0,   // tasks the user finished
  skips: 0,       // "try something else" clicks since the last completion
  visits: 0       // how many times the page was opened
};

let state = loadState();
let currentPlan = null; // the plan currently on screen

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Object.assign({}, defaultState, saved);
  } catch (e) {
    return Object.assign({}, defaultState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // storage unavailable: the app still works for this session
  }
}

// ---------- Content for each possible outcome ----------
const plans = {
  deep: {
    label: "Deep focus",
    tasks: [
      "Work on your hardest project with notifications off.",
      "Write the first draft of something you've been avoiding.",
      "Study one difficult topic using the 25/5 Pomodoro rhythm."
    ]
  },
  light: {
    label: "Light tasks",
    tasks: [
      "Clear your inbox and reply to three messages.",
      "Tidy your workspace and organize today's to-do list.",
      "Do a quick review of notes from earlier this week."
    ]
  },
  recharge: {
    label: "Recharge",
    tasks: [
      "Take a 10-minute walk away from screens.",
      "Drink water, stretch, and rest your eyes for a few minutes.",
      "Do a short breathing exercise, then reassess."
    ]
  },
  calm: {
    label: "Calm and reset",
    tasks: [
      "Write down everything on your mind, then circle the one thing that matters.",
      "Pick the smallest task on your list and finish only that.",
      "Do five minutes of slow breathing before touching your to-do list."
    ]
  },
  nudge: {
    label: "Quick-start nudge",
    tasks: [
      "Set a timer for 5 minutes and start anything. You can stop when it rings."
    ]
  }
};

// ---------- Decision logic ----------
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getLevel(completed) {
  if (completed >= 10) return "Focus Master";
  else if (completed >= 5) return "Momentum Builder";
  else if (completed >= 1) return "Getting Started";
  else return "Newcomer";
}

function chooseMode(energy, mood, minutes, skips) {
  // Previous actions come first: too many skips triggers the nudge state
  if (skips >= 3) {
    return "nudge";
  }
  if (energy <= 3 || mood === "tired") {
    return "recharge";
  } else if (mood === "stressed") {
    return "calm";
  } else if (energy >= 7 && minutes >= 45) {
    return "deep";
  } else {
    return "light";
  }
}

function buildNote(mode, minutes, completed) {
  let note = "";
  if (mode === "deep" && minutes >= 90) {
    note = "You have lots of time. Plan a short break halfway through.";
  } else if (mode === "light" && minutes < 15) {
    note = "Short on time? Pick just one item and finish it.";
  } else if (mode === "nudge") {
    note = "You've skipped a few suggestions in a row, so here's an easier way in.";
  } else if (mode === "recharge") {
    note = "Rest counts as progress. Come back when you feel ready.";
  }
  if (completed >= 5) {
    note += (note ? " " : "") + "Nice streak so far. Keep it going!";
  }
  return note;
}

function makePlan(energy, mood, minutes) {
  const mode = chooseMode(energy, mood, minutes, state.skips);
  const options = plans[mode].tasks;
  // Rotate through the options as the user completes or skips tasks
  const index = (state.completed + state.skips) % options.length;
  return {
    mode: mode,
    label: plans[mode].label,
    task: options[index],
    note: buildNote(mode, minutes, state.completed),
    energy: energy,
    mood: mood,
    minutes: minutes
  };
}

// ---------- DOM ----------
const form = document.getElementById("checkin-form");
const nameInput = document.getElementById("name");
const energyInput = document.getElementById("energy");
const energyValue = document.getElementById("energy-value");
const moodInput = document.getElementById("mood");
const minutesInput = document.getElementById("minutes");
const errorEl = document.getElementById("error");

const greetingEl = document.getElementById("greeting");
const badgeEl = document.getElementById("level-badge");

const resultEl = document.getElementById("result");
const resultMode = document.getElementById("result-mode");
const resultTitle = document.getElementById("result-title");
const resultText = document.getElementById("result-text");
const resultNote = document.getElementById("result-note");

const doneBtn = document.getElementById("done-btn");
const skipBtn = document.getElementById("skip-btn");
const resetBtn = document.getElementById("reset-btn");

function renderStats() {
  document.getElementById("stat-completed").textContent = state.completed;
  document.getElementById("stat-skips").textContent = state.skips;
  document.getElementById("stat-visits").textContent = state.visits;
  badgeEl.textContent = "Level: " + getLevel(state.completed);
}

function renderGreeting() {
  const timeOfDay = getTimeOfDay();
  if (state.name && state.visits > 1) {
    greetingEl.textContent = "Welcome back, " + state.name + "! Good " + timeOfDay + ".";
  } else if (state.name) {
    greetingEl.textContent = "Good " + timeOfDay + ", " + state.name + ".";
  } else {
    greetingEl.textContent = "Good " + timeOfDay + "! Tell me how you're doing and I'll pick your next task.";
  }
}

function renderPlan(plan) {
  resultEl.className = "card result mode-" + plan.mode;
  resultMode.textContent = plan.label;
  resultTitle.textContent = state.name ? "Here's your plan, " + state.name : "Here's your plan";
  resultText.textContent = plan.task;
  resultNote.textContent = plan.note;
}

// ---------- Events ----------
energyInput.addEventListener("input", function () {
  energyValue.textContent = energyInput.value;
});

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  const minutes = parseInt(minutesInput.value, 10);

  if (!name && !state.name) {
    errorEl.textContent = "Please enter your name.";
    return;
  } else if (isNaN(minutes) || minutes < 5) {
    errorEl.textContent = "Please enter at least 5 minutes.";
    return;
  }
  errorEl.textContent = "";

  if (name) state.name = name;
  currentPlan = makePlan(parseInt(energyInput.value, 10), moodInput.value, minutes);
  saveState();
  renderGreeting();
  renderPlan(currentPlan);
});

doneBtn.addEventListener("click", function () {
  if (!currentPlan) return;
  state.completed += 1;
  state.skips = 0; // finishing a task clears the skip streak
  saveState();
  renderStats();

  const level = getLevel(state.completed);
  resultMode.textContent = "Task complete";
  resultTitle.textContent = "Well done" + (state.name ? ", " + state.name : "") + "!";
  resultText.textContent = "You've completed " + state.completed + " task" +
    (state.completed === 1 ? "" : "s") + ". Current level: " + level + ".";
  resultNote.textContent = "Update your check-in above to get your next plan.";
  currentPlan = null;
});

skipBtn.addEventListener("click", function () {
  if (!currentPlan) return;
  state.skips += 1;
  saveState();
  renderStats();
  // Rebuild the plan with the same inputs but the new state
  currentPlan = makePlan(currentPlan.energy, currentPlan.mood, currentPlan.minutes);
  renderPlan(currentPlan);
});

resetBtn.addEventListener("click", function () {
  state = Object.assign({}, defaultState, { visits: 1 });
  saveState();
  currentPlan = null;
  resultEl.classList.add("hidden");
  nameInput.value = "";
  renderGreeting();
  renderStats();
});

// ---------- Init ----------
state.visits += 1;
saveState();
if (state.name) nameInput.value = state.name;
renderGreeting();
renderStats();