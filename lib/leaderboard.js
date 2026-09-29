const SCORES_KEY = "coin-maze-leaderboard";
const NAME_KEY = "coin-maze-last-name";
const MAX_ENTRIES = 5;

export function getScores() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// entry: { name, score, timeMs }
export function saveScore(entry) {
  if (typeof window === "undefined") return getScores();
  try {
    const entries = getScores();
    entries.push({
      name: (entry.name || "Player").slice(0, 12),
      score: entry.score,
      timeMs: entry.timeMs,
      date: new Date().toLocaleDateString(),
    });
    entries.sort((a, b) => b.score - a.score);
    const trimmed = entries.slice(0, MAX_ENTRIES);
    window.localStorage.setItem(SCORES_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return getScores();
  }
}

export function getLastName() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function setLastName(name) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // Non-critical; ignore.
  }
}

export function formatTime(ms) {
  const safeMs = Number.isFinite(ms) ? ms : 0;
  const totalSeconds = Math.max(0, Math.floor(safeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
