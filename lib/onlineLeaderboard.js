// Thin fetch wrapper around /api/leaderboard. Both functions resolve to
// `null` on any failure (network error, non-2xx, bad JSON) rather than
// throwing, so the caller can cleanly fall back to the per-device
// localStorage leaderboard in lib/leaderboard.js.

export async function fetchOnlineScores() {
  try {
    const res = await fetch("/api/leaderboard", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function submitOnlineScore({ name, score, timeMs }) {
  try {
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score, timeMs }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}
