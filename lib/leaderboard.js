const STORAGE_KEY = "coin-maze-leaderboard";
const MAX_ENTRIES = 5;

export function getScores() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScore(score) {
  if (typeof window === "undefined") return getScores();
  try {
    const entries = getScores();
    entries.push({ score, date: new Date().toLocaleDateString() });
    entries.sort((a, b) => b.score - a.score);
    const trimmed = entries.slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return getScores();
  }
}
