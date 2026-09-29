const SCORES_KEY = "coin-maze-leaderboard";
const NAME_KEY = "coin-maze-last-name";
const BEST_TIMES_KEY = "coin-maze-best-level-times";
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

// Returns an array of length `count`, one best time (ms) per level index,
// or null for a level that has no recorded time yet.
export function getBestLevelTimes(count) {
  if (typeof window === "undefined") return Array(count).fill(null);
  try {
    const raw = window.localStorage.getItem(BEST_TIMES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(parsed) ? parsed : [];
    return Array.from({ length: count }, (_, i) => (typeof arr[i] === "number" ? arr[i] : null));
  } catch {
    return Array(count).fill(null);
  }
}

// Records timeMs as the best time for levelIndex if it beats (or is the
// first) recorded time. Returns the updated full array plus whether this
// call actually improved the record, so the UI can show "New best!".
export function maybeUpdateBestLevelTime(levelIndex, timeMs, count) {
  const times = getBestLevelTimes(count);
  const existing = times[levelIndex];
  const improved = existing === null || timeMs < existing;
  if (improved) {
    times[levelIndex] = timeMs;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(times));
      }
    } catch {
      // Non-critical; ignore.
    }
  }
  return { times, improved };
}
