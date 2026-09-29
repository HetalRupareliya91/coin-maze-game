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
