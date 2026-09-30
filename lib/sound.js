// Small Web Audio API sound effects, generated as short oscillator tones
// rather than shipped audio files, so there's nothing to load or license.

let audioCtx = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep({ frequency, duration, type = "sine", gain = 0.15, delay = 0 }) {
  try {
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gainNode.gain.value = gain;
    osc.connect(gainNode).connect(ctx.destination);

    const startAt = ctx.currentTime + delay;
    osc.start(startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.stop(startAt + duration + 0.02);
  } catch {
    // Audio is a nice-to-have; never let it break gameplay.
  }
}

export const sound = {
  coin: () => beep({ frequency: 880, duration: 0.08, type: "square", gain: 0.12 }),

  powerup: () => {
    beep({ frequency: 660, duration: 0.1, type: "triangle", gain: 0.15 });
    beep({ frequency: 990, duration: 0.12, type: "triangle", gain: 0.15, delay: 0.08 });
  },

  hit: () => beep({ frequency: 160, duration: 0.25, type: "sawtooth", gain: 0.2 }),

  life: () => {
    beep({ frequency: 784, duration: 0.12, type: "sine", gain: 0.15 });
    beep({ frequency: 1046, duration: 0.16, type: "sine", gain: 0.15, delay: 0.1 });
  },

  magnet: () => {
    beep({ frequency: 220, duration: 0.1, type: "triangle", gain: 0.12 });
    beep({ frequency: 440, duration: 0.1, type: "triangle", gain: 0.12, delay: 0.06 });
    beep({ frequency: 880, duration: 0.14, type: "triangle", gain: 0.12, delay: 0.12 });
  },

  bomb: () => {
    beep({ frequency: 100, duration: 0.3, type: "sawtooth", gain: 0.22 });
    beep({ frequency: 60, duration: 0.35, type: "sawtooth", gain: 0.2, delay: 0.05 });
  },

  invincible: () => {
    [523, 659, 784, 988, 1318].forEach((f, i) =>
      beep({ frequency: f, duration: 0.1, type: "square", gain: 0.13, delay: i * 0.06 })
    );
  },

  levelComplete: () => {
    [523, 659, 784].forEach((f, i) =>
      beep({ frequency: f, duration: 0.15, type: "square", gain: 0.14, delay: i * 0.12 })
    );
  },

  victory: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      beep({ frequency: f, duration: 0.18, type: "square", gain: 0.15, delay: i * 0.14 })
    );
  },

  gameOver: () => {
    [392, 330, 262].forEach((f, i) =>
      beep({ frequency: f, duration: 0.25, type: "sawtooth", gain: 0.16, delay: i * 0.18 })
    );
  },
};
