"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateMaze, carveOpenings, randomPathCell, TILE } from "../lib/maze";
import { LEVELS } from "../lib/levels";
import {
  getScores,
  saveScore,
  getLastName,
  setLastName,
  formatTime,
  getBestLevelTimes,
  maybeUpdateBestLevelTime,
} from "../lib/leaderboard";
import { fetchOnlineScores, submitOnlineScore } from "../lib/onlineLeaderboard";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "../lib/settings";
import { sound } from "../lib/sound";

const COLS = 17;
const ROWS = 13;
const CELL = 32;
const START = { x: 1, y: 1 };
const STARTING_LIVES = 3;
const MAX_LIVES = 5;

const NORMAL_MOVE_MS = 140;
const BOOST_MOVE_MS = 70;
const SPEED_BOOST_MS = 6000;
const SHIELD_MS = 6000;
const MAGNET_MS = 7000;
const MAGNET_RADIUS = 2.2;
const INVINCIBLE_MS = 6000;
const INVINCIBLE_KILL_SCORE = 25;

const POWERUP_KINDS = ["speed", "shield", "life", "magnet", "bomb", "invincible"];
const POWERUP_COLORS = {
  speed: "#7ee787",
  shield: "#7dd3fc",
  life: "#ff8fab",
  magnet: "#c792ea",
  bomb: "#ff9f43",
  invincible: "#ffe066",
};

const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

const KEY_TO_NAME = {
  ArrowUp: "up", w: "up", W: "up",
  ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
};

const NAME_TO_DELTA = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

function cellKey(x, y) {
  return `${x},${y}`;
}

function buildLevel(levelIndex, settings) {
  const def = LEVELS[levelIndex];
  const base = generateMaze(COLS, ROWS);
  const maze = carveOpenings(base, def.openExtra);

  const enemyCount = Math.max(1, Math.round(def.enemyCount * settings.enemyCountMult));
  const enemyMoveMs = Math.max(120, Math.round(def.enemyMoveIntervalMs / settings.enemySpeedMult));

  const used = new Set([cellKey(START.x, START.y)]);

  const coins = new Map();
  while (coins.size < def.coinCount) {
    const cell = randomPathCell(maze, COLS, ROWS, used);
    used.add(cellKey(cell.x, cell.y));
    coins.set(cellKey(cell.x, cell.y), cell);
  }

  const powerups = new Map();
  while (powerups.size < def.powerupCount) {
    const cell = randomPathCell(maze, COLS, ROWS, used);
    const key = cellKey(cell.x, cell.y);
    used.add(key);
    const kind = POWERUP_KINDS[Math.floor(Math.random() * POWERUP_KINDS.length)];
    powerups.set(key, { ...cell, kind });
  }

  const enemies = [];
  while (enemies.length < enemyCount) {
    const cell = randomPathCell(maze, COLS, ROWS, used);
    used.add(cellKey(cell.x, cell.y));
    enemies.push({
      x: cell.x,
      y: cell.y,
      renderX: cell.x,
      renderY: cell.y,
      dir: DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)],
    });
  }

  return { maze, coins, powerups, enemies, enemyMoveMs };
}

export default function CoinMazeGame() {
  const canvasRef = useRef(null);
  const levelIndexRef = useRef(0);
  const settingsRef = useRef({ ...DEFAULT_SETTINGS });
  const levelRef = useRef(buildLevel(0, DEFAULT_SETTINGS));
  const playerRef = useRef({ ...START });
  const playerRenderRef = useRef({ ...START }); // smoothed visual position
  const livesRef = useRef(STARTING_LIVES);
  const statusRef = useRef("playing"); // playing | levelComplete | won | lost
  const scoreRef = useRef(0);

  const heldKeysRef = useRef([]); // ordered list of currently-held direction names
  const lastMoveRef = useRef(0);
  const lastEnemyMoveRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const speedBoostUntilRef = useRef(0);
  const shieldUntilRef = useRef(0);
  const magnetUntilRef = useRef(0);
  const invincibleUntilRef = useRef(0);
  const rafRef = useRef(null);

  // Speedrun timer: accumulates while status === "playing" and pauses
  // automatically whenever it isn't (level-complete screen, game over, etc).
  const elapsedMsRef = useRef(0);
  const runningSinceRef = useRef(null);
  const lastDisplayUpdateRef = useRef(0);
  const levelStartAccumRef = useRef(0); // elapsedMsRef value when the current level began

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [status, setStatus] = useState("playing");
  const [coinsLeft, setCoinsLeft] = useState(LEVELS[0].coinCount);
  const [levelLabel, setLevelLabel] = useState(LEVELS[0].label);
  const [elapsedDisplay, setElapsedDisplay] = useState("0:00");
  const [scores, setScores] = useState([]);
  const [leaderboardSource, setLeaderboardSource] = useState("local"); // "online" | "local"
  const [bestTimes, setBestTimes] = useState(() => Array(LEVELS.length).fill(null));
  const [lastLevelTime, setLastLevelTime] = useState(null); // { ms, improved }
  const [nameInput, setNameInput] = useState("");
  const [runSaved, setRunSaved] = useState(false);
  const [settings, setSettings] = useState({ enemyCountMult: 1, enemySpeedMult: 1 });

  // One-time setup: load stored settings/name/best-times, and re-apply
  // stored difficulty settings if they differ from the defaults already
  // used for the initial synchronous level build above. Also try the
  // shared leaderboard before falling back to the local one.
  useEffect(() => {
    const stored = getSettings();
    settingsRef.current = stored;
    setSettings(stored);
    if (stored.enemyCountMult !== DEFAULT_SETTINGS.enemyCountMult || stored.enemySpeedMult !== DEFAULT_SETTINGS.enemySpeedMult) {
      loadLevel(0);
    }

    setNameInput(getLastName());
    setBestTimes(getBestLevelTimes(LEVELS.length));

    let cancelled = false;
    (async () => {
      const online = await fetchOnlineScores();
      if (cancelled) return;
      if (online) {
        setScores(online);
        setLeaderboardSource("online");
      } else {
        setScores(getScores());
        setLeaderboardSource("local");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isWall = useCallback((x, y) => {
    const { maze } = levelRef.current;
    if (y < 0 || y >= maze.length || x < 0 || x >= maze[0].length) return true;
    return maze[y][x] === TILE.WALL;
  }, []);

  const loadLevel = useCallback((index) => {
    levelIndexRef.current = index;
    levelRef.current = buildLevel(index, settingsRef.current);
    playerRef.current = { ...START };
    playerRenderRef.current = { ...START };
    lastEnemyMoveRef.current = 0;
    speedBoostUntilRef.current = 0;
    shieldUntilRef.current = 0;
    magnetUntilRef.current = 0;
    invincibleUntilRef.current = 0;
    levelStartAccumRef.current = elapsedMsRef.current;
    setCoinsLeft(LEVELS[index].coinCount);
    setLevelLabel(LEVELS[index].label);
  }, []);

  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = STARTING_LIVES;
    statusRef.current = "playing";
    elapsedMsRef.current = 0;
    runningSinceRef.current = null;
    lastDisplayUpdateRef.current = 0;
    setScore(0);
    setLives(STARTING_LIVES);
    setStatus("playing");
    setElapsedDisplay("0:00");
    setRunSaved(false);
    setLastLevelTime(null);
    loadLevel(0);
  }, [loadLevel]);

  const advanceLevel = useCallback(() => {
    const next = levelIndexRef.current + 1;
    statusRef.current = "playing";
    setStatus("playing");
    setLastLevelTime(null);
    loadLevel(next);
  }, [loadLevel]);

  const updateSetting = useCallback((key, value) => {
    const next = { ...settingsRef.current, [key]: value };
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
  }, []);

  // Folds the currently-running stint into the accumulator (if any) and
  // returns the total elapsed ms at this instant. Safe to call whenever
  // gameplay pauses, whether that's a level clear, a win, or a loss.
  function freezeTimer(now) {
    if (runningSinceRef.current !== null) {
      elapsedMsRef.current += now - runningSinceRef.current;
      runningSinceRef.current = null;
    }
    setElapsedDisplay(formatTime(elapsedMsRef.current));
    return elapsedMsRef.current;
  }

  const finishRun = useCallback((finalStatus, now) => {
    const total = freezeTimer(now);
    if (finalStatus === "won") {
      const { times } = maybeUpdateBestLevelTime(levelIndexRef.current, total - levelStartAccumRef.current, LEVELS.length);
      setBestTimes(times);
    }
    statusRef.current = finalStatus;
    setStatus(finalStatus);
    if (finalStatus === "won") sound.victory();
    if (finalStatus === "lost") sound.gameOver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveScore = useCallback(async () => {
    const cleanName = nameInput.trim().slice(0, 12) || "Player";
    setLastName(cleanName);
    const entry = { name: cleanName, score: scoreRef.current, timeMs: elapsedMsRef.current };

    const online = await submitOnlineScore(entry);
    if (online) {
      setScores(online);
      setLeaderboardSource("online");
    } else {
      setScores(saveScore(entry));
      setLeaderboardSource("local");
    }
    setRunSaved(true);
  }, [nameInput]);

  function handleLevelCleared(now) {
    const total = freezeTimer(now);
    const levelTime = total - levelStartAccumRef.current;
    const { times, improved } = maybeUpdateBestLevelTime(levelIndexRef.current, levelTime, LEVELS.length);
    setBestTimes(times);
    setLastLevelTime({ ms: levelTime, improved });
    sound.levelComplete();
    statusRef.current = "levelComplete";
    setStatus("levelComplete");
  }

  function collectCoin(key, now) {
    const { coins } = levelRef.current;
    if (!coins.has(key)) return;
    coins.delete(key);
    sound.coin();
    scoreRef.current += 10;
    setScore(scoreRef.current);
    setCoinsLeft(coins.size);
    if (coins.size === 0) {
      if (levelIndexRef.current + 1 < LEVELS.length) {
        handleLevelCleared(now);
      } else {
        finishRun("won", now);
      }
    }
  }

  // Keyboard: track which direction keys are currently held.
  useEffect(() => {
    function press(name) {
      const held = heldKeysRef.current;
      if (!held.includes(name)) held.push(name);
    }
    function release(name) {
      heldKeysRef.current = heldKeysRef.current.filter((k) => k !== name);
    }
    function handleKeyDown(e) {
      const name = KEY_TO_NAME[e.key];
      if (!name) return;
      e.preventDefault();
      press(name);
    }
    function handleKeyUp(e) {
      const name = KEY_TO_NAME[e.key];
      if (!name) return;
      release(name);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Touch/mouse D-pad uses the same held-direction mechanism as keyboard.
  const pressDirection = useCallback((name) => {
    const held = heldKeysRef.current;
    if (!held.includes(name)) held.push(name);
  }, []);
  const releaseDirection = useCallback((name) => {
    heldKeysRef.current = heldKeysRef.current.filter((k) => k !== name);
  }, []);

  function tryMove(dx, dy, now) {
    const player = playerRef.current;
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (isWall(nx, ny)) return;
    playerRef.current = { x: nx, y: ny };

    const { powerups } = levelRef.current;
    const key = cellKey(nx, ny);

    collectCoin(key, now);

    if (powerups.has(key)) {
      const p = powerups.get(key);
      powerups.delete(key);
      if (p.kind === "speed") {
        sound.powerup();
        speedBoostUntilRef.current = now + SPEED_BOOST_MS;
      } else if (p.kind === "shield") {
        sound.powerup();
        shieldUntilRef.current = now + SHIELD_MS;
      } else if (p.kind === "life") {
        sound.life();
        livesRef.current = Math.min(MAX_LIVES, livesRef.current + 1);
        setLives(livesRef.current);
      } else if (p.kind === "magnet") {
        sound.magnet();
        magnetUntilRef.current = now + MAGNET_MS;
      } else if (p.kind === "bomb") {
        sound.bomb();
        levelRef.current.enemies = [];
      } else if (p.kind === "invincible") {
        sound.invincible();
        invincibleUntilRef.current = now + INVINCIBLE_MS;
      }
    }
  }

  function applyMagnet(now) {
    if (magnetUntilRef.current <= now) return;
    const player = playerRef.current;
    const { coins } = levelRef.current;
    for (const [key, coin] of Array.from(coins.entries())) {
      const dx = coin.x - player.x;
      const dy = coin.y - player.y;
      if (dx * dx + dy * dy <= MAGNET_RADIUS * MAGNET_RADIUS) {
        collectCoin(key, now);
      }
    }
  }

  // Main loop: movement pacing, enemy AI, collisions, timer, smoothing, rendering.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function moveEnemies() {
      for (const enemy of levelRef.current.enemies) {
        const options = DIRECTIONS.filter((d) => !isWall(enemy.x + d.dx, enemy.y + d.dy));
        if (options.length === 0) continue;
        const canContinue = options.some((d) => d.dx === enemy.dir.dx && d.dy === enemy.dir.dy);
        if (!canContinue || Math.random() < 0.3) {
          enemy.dir = options[Math.floor(Math.random() * options.length)];
        }
        enemy.x += enemy.dir.dx;
        enemy.y += enemy.dir.dy;
      }
    }

    function checkEnemyCollision(now) {
      const player = playerRef.current;
      const enemies = levelRef.current.enemies;
      const hitIndex = enemies.findIndex((e) => e.x === player.x && e.y === player.y);
      if (hitIndex === -1) return;

      if (invincibleUntilRef.current > now) {
        enemies.splice(hitIndex, 1);
        sound.powerup();
        scoreRef.current += INVINCIBLE_KILL_SCORE;
        setScore(scoreRef.current);
        return;
      }

      if (shieldUntilRef.current > now) return;

      sound.hit();
      livesRef.current -= 1;
      if (livesRef.current <= 0) {
        setLives(0);
        finishRun("lost", now);
      } else {
        playerRef.current = { ...START };
        playerRenderRef.current = { ...START };
        setLives(livesRef.current);
      }
    }

    function updateSmoothing(dt) {
      const factor = 1 - Math.exp(-dt * 16);
      const render = playerRenderRef.current;
      const logical = playerRef.current;
      render.x += (logical.x - render.x) * factor;
      render.y += (logical.y - render.y) * factor;

      for (const enemy of levelRef.current.enemies) {
        enemy.renderX += (enemy.x - enemy.renderX) * factor;
        enemy.renderY += (enemy.y - enemy.renderY) * factor;
      }
    }

    function draw(now) {
      const { maze, coins, powerups, enemies } = levelRef.current;

      ctx.fillStyle = "#1b1035";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#4a3f7a";
      for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[0].length; x++) {
          if (maze[y][x] === TILE.WALL) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }

      ctx.fillStyle = "#ffcf5c";
      for (const coin of coins.values()) {
        ctx.beginPath();
        ctx.arc(coin.x * CELL + CELL / 2, coin.y * CELL + CELL / 2, CELL * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of powerups.values()) {
        ctx.fillStyle = POWERUP_COLORS[p.kind];
        ctx.beginPath();
        ctx.arc(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2, CELL * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#ff6b6b";
      for (const enemy of enemies) {
        ctx.beginPath();
        ctx.arc(enemy.renderX * CELL + CELL / 2, enemy.renderY * CELL + CELL / 2, CELL * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }

      const render = playerRenderRef.current;
      const invincible = invincibleUntilRef.current > now;
      const shielded = shieldUntilRef.current > now;
      ctx.fillStyle = invincible ? "#ffe066" : shielded ? "#7dd3fc" : "#4fd8c4";
      ctx.beginPath();
      ctx.arc(render.x * CELL + CELL / 2, render.y * CELL + CELL / 2, CELL * 0.34, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "13px sans-serif";
      ctx.textAlign = "right";
      let badgeY = 18;
      const badges = [
        [speedBoostUntilRef.current, "#7ee787", "Speed"],
        [shieldUntilRef.current, "#7dd3fc", "Shield"],
        [magnetUntilRef.current, "#c792ea", "Magnet"],
        [invincibleUntilRef.current, "#ffe066", "Invincible"],
      ];
      for (const [until, color, label] of badges) {
        if (until > now) {
          ctx.fillStyle = color;
          ctx.fillText(`${label} ${Math.ceil((until - now) / 1000)}s`, canvas.width - 8, badgeY);
          badgeY += 16;
        }
      }
    }

    function loop(timestamp) {
      const dt = lastFrameTimeRef.current ? Math.min(0.05, (timestamp - lastFrameTimeRef.current) / 1000) : 0;
      lastFrameTimeRef.current = timestamp;
      updateSmoothing(dt);

      if (statusRef.current === "playing") {
        if (runningSinceRef.current === null) runningSinceRef.current = timestamp;
        if (timestamp - lastDisplayUpdateRef.current > 200) {
          setElapsedDisplay(formatTime(elapsedMsRef.current + (timestamp - runningSinceRef.current)));
          lastDisplayUpdateRef.current = timestamp;
        }

        applyMagnet(timestamp);

        const interval = speedBoostUntilRef.current > timestamp ? BOOST_MOVE_MS : NORMAL_MOVE_MS;
        if (timestamp - lastMoveRef.current > interval) {
          const activeName = heldKeysRef.current[heldKeysRef.current.length - 1];
          if (activeName) {
            const { dx, dy } = NAME_TO_DELTA[activeName];
            tryMove(dx, dy, timestamp);
          }
          lastMoveRef.current = timestamp;
        }

        const { enemyMoveMs } = levelRef.current;
        if (timestamp - lastEnemyMoveRef.current > enemyMoveMs) {
          moveEnemies();
          checkEnemyCollision(timestamp);
          lastEnemyMoveRef.current = timestamp;
        }
      } else if (runningSinceRef.current !== null) {
        elapsedMsRef.current += timestamp - runningSinceRef.current;
        runningSinceRef.current = null;
      }
      draw(timestamp);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWall, finishRun]);

  if (!levelRef.current) return null;

  return (
    <div className="game-wrap">
      <div className="hud">
        <span>{levelLabel}</span>
        <span>Score {score}</span>
        <span>{elapsedDisplay}</span>
        <span>{"● ".repeat(lives).trim() || "—"}</span>
        <span>Coins left {coinsLeft}</span>
      </div>

      <div className="canvas-shell">
        <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} />
        {status !== "playing" && (
          <div className="overlay">
            {status === "levelComplete" && (
              <>
                <p>
                  Level cleared — {lastLevelTime ? formatTime(lastLevelTime.ms) : elapsedDisplay}
                  {lastLevelTime?.improved ? " — new best!" : ""}
                </p>
                <button onClick={advanceLevel}>Next level</button>
              </>
            )}
            {(status === "won" || status === "lost") && (
              <>
                <p>
                  {status === "won" ? "All levels cleared" : "Caught by an enemy"} — score {score} in {elapsedDisplay}
                </p>
                {!runSaved ? (
                  <div className="save-score">
                    <input
                      type="text"
                      maxLength={12}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your name"
                    />
                    <button onClick={handleSaveScore}>Save score</button>
                  </div>
                ) : (
                  <p className="hint">Saved to your top scores.</p>
                )}
                <button onClick={resetGame}>Play again</button>
              </>
            )}
          </div>
        )}
      </div>

      <div
        className="dpad"
        onPointerLeave={() => {
          heldKeysRef.current = [];
        }}
      >
        <div />
        <button onPointerDown={() => pressDirection("up")} onPointerUp={() => releaseDirection("up")}>▲</button>
        <div />
        <button onPointerDown={() => pressDirection("left")} onPointerUp={() => releaseDirection("left")}>◀</button>
        <div />
        <button onPointerDown={() => pressDirection("right")} onPointerUp={() => releaseDirection("right")}>▶</button>
        <div />
        <button onPointerDown={() => pressDirection("down")} onPointerUp={() => releaseDirection("down")}>▼</button>
        <div />
      </div>

      <p className="hint">
        Arrow keys, WASD, or the on-screen pad to move. Green = speed, blue = shield, pink = extra life, purple =
        magnet, orange = bomb (clears enemies), gold = invincible (touch enemies to defeat them).
      </p>

      <div className="settings">
        <label>
          Enemies x{settings.enemyCountMult.toFixed(2)}
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.25}
            value={settings.enemyCountMult}
            onChange={(e) => updateSetting("enemyCountMult", Number(e.target.value))}
          />
        </label>
        <label>
          Enemy speed x{settings.enemySpeedMult.toFixed(2)}
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.25}
            value={settings.enemySpeedMult}
            onChange={(e) => updateSetting("enemySpeedMult", Number(e.target.value))}
          />
        </label>
        <p className="hint">Applies to the next level or a new game, not the level in progress.</p>
      </div>

      <div className="leaderboard">
        <h2>Top scores <span className="source-tag">{leaderboardSource === "online" ? "shared" : "this device"}</span></h2>
        {scores.length === 0 ? (
          <p className="hint">No runs yet — finish a game to set the first score.</p>
        ) : (
          <ol>
            {scores.map((entry, i) => (
              <li key={i}>
                <span>{entry.name || "Player"}</span>
                <span>{entry.score} pts</span>
                <span>{formatTime(entry.timeMs)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="leaderboard">
        <h2>Best level times</h2>
        <ol>
          {LEVELS.map((lvl, i) => (
            <li key={lvl.label}>
              <span>{lvl.label}</span>
              <span>{bestTimes[i] != null ? formatTime(bestTimes[i]) : "—"}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
