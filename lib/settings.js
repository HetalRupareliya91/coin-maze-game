const SETTINGS_KEY = "coin-maze-settings";

export const DEFAULT_SETTINGS = { enemyCountMult: 1, enemySpeedMult: 1, fogOfWar: true, presetName: "normal" };

const KNOWN_PRESETS = ["easy", "normal", "hard", "custom"];

export function getSettings() {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      enemyCountMult: Number.isFinite(parsed.enemyCountMult)
        ? parsed.enemyCountMult
        : DEFAULT_SETTINGS.enemyCountMult,
      enemySpeedMult: Number.isFinite(parsed.enemySpeedMult)
        ? parsed.enemySpeedMult
        : DEFAULT_SETTINGS.enemySpeedMult,
      fogOfWar: typeof parsed.fogOfWar === "boolean" ? parsed.fogOfWar : DEFAULT_SETTINGS.fogOfWar,
      presetName: KNOWN_PRESETS.includes(parsed.presetName) ? parsed.presetName : DEFAULT_SETTINGS.presetName,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Non-critical; ignore.
  }
}
