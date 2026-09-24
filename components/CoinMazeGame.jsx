"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateMaze, carveOpenings, randomPathCell, TILE } from "../lib/maze";
import { LEVELS } from "../lib/levels";
import { getScores, saveScore } from "../lib/leaderboard";

const COLS = 17;
const ROWS = 13;
const CELL = 32;
const START = { x: 1, y: 1 };
const STARTING_LIVES = 3;

const NORMAL_MOVE_MS = 140;
const BOOST_MOVE_MS = 70;
const SPEED_BOOST_MS = 6000;
const SHIELD_MS = 6000;

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

function buildLevel(levelIndex) {
  const def = LEVELS[levelIndex];
  const base = generateMaze(COLS, ROWS);
  const maze = carveOpenings(base, def.openExtra);

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
    powerups.set(key, { ...cell, kind: Math.random() < 0.5 ? "speed" : "shield" });
  }

  const enemies = [];
  while (enemies.length < def.enemyCount) {
    const cell = randomPathCell(maze, COLS, ROWS, used);
    used.add(cellKey(cell.x, cell.y));
    enemies.push({
      x: cell.x,
      y: cell.y,
      dir: DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)],
    });
  }

  return { maze, coins, powerups, enemies, enemyMoveMs: def.enemyMoveIntervalMs };
}

export default function CoinMazeGame() {
  const canvasRef = useRef(null);
  const levelIndexRef = useRef(0);
  const levelRef = useRef(buildLevel(0));
  const playerRef = useRef({ ...START });
  const livesRef = useRef(STARTING_LIVES);
  const statusRef = useRef("playing"); // playing | levelComplete | won | lost
  const scoreRef = useRef(0);
  const savedRef = useRef(false);

  const heldKeysRef = useRef([]); // ordered list of currently-held direction names
  const lastMoveRef = useRef(0);
  const lastEnemyMoveRef = useRef(0);
  const speedBoostUntilRef = useRef(0);
  const shieldUntilRef = useRef(0);
  const rafRef = useRef(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [status, setStatus] = useState("playing");
  const [coinsLeft, setCoinsLeft] = useState(LEVELS[0].coinCount);
  const [levelLabel, setLevelLabel] = useState(LEVELS[0].label);
  const [scores, setScores] = useState([]);

  useEffect(() => setScores(getScores()), []);

  const isWall = useCallback((x, y) => {
    const { maze } = levelRef.current;
    if (y < 0 || y >= maze.length || x < 0 || x >= maze[0].length) return true;
    return maze[y][x] === TILE.WALL;
  }, []);

  const loadLevel = useCallback((index) => {
    levelIndexRef.current = index;
    levelRef.current = buildLevel(index);
    playerRef.current = { ...START };
    lastEnemyMoveRef.current = 0;
    speedBoostUntilRef.current = 0;
    shieldUntilRef.current = 0;
    setCoinsLeft(LEVELS[index].coinCount);
    setLevelLabel(LEVELS[index].label);
  }, []);

  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = STARTING_LIVES;
    statusRef.current = "playing";
    savedRef.current = false;
    setScore(0);
    setLives(STARTING_LIVES);
    setStatus("playing");
    loadLevel(0);
  }, [loadLevel]);

  const advanceLevel = useCallback(() => {
    const next = levelIndexRef.current + 1;
    statusRef.current = "playing";
    setStatus("playing");
    loadLevel(next);
  }, [loadLevel]);

  const finishRun = useCallback((finalStatus) => {
    statusRef.current = finalStatus;
    setStatus(finalStatus);
    if (!savedRef.current) {
      savedRef.current = true;
      setScores(saveScore(scoreRef.current));
    }
  }, []);

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

    const { coins, powerups } = levelRef.current;
    const key = cellKey(nx, ny);

    if (coins.has(key)) {
      coins.delete(key);
      scoreRef.current += 10;
      setScore(scoreRef.current);
      setCoinsLeft(coins.size);
      if (coins.size === 0) {
        if (levelIndexRef.current + 1 < LEVELS.length) {
          statusRef.current = "levelComplete";
          setStatus("levelComplete");
        } else {
          finishRun("won");
        }
        return;
      }
    }

    if (powerups.has(key)) {
      const p = powerups.get(key);
      powerups.delete(key);
      if (p.kind === "speed") speedBoostUntilRef.current = now + SPEED_BOOST_MS;
      else shieldUntilRef.current = now + SHIELD_MS;
    }
  }

  // Main loop: movement pacing, enemy AI, collisions, rendering.
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
      if (shieldUntilRef.current > now) return;
      const player = playerRef.current;
      const hit = levelRef.current.enemies.some((e) => e.x === player.x && e.y === player.y);
      if (!hit) return;

      livesRef.current -= 1;
      if (livesRef.current <= 0) {
        setLives(0);
        finishRun("lost");
      } else {
        playerRef.current = { ...START };
        setLives(livesRef.current);
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
        ctx.fillStyle = p.kind === "speed" ? "#7ee787" : "#7dd3fc";
        ctx.beginPath();
        ctx.arc(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2, CELL * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#ff6b6b";
      for (const enemy of enemies) {
        ctx.beginPath();
        ctx.arc(enemy.x * CELL + CELL / 2, enemy.y * CELL + CELL / 2, CELL * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }

      const player = playerRef.current;
      const shielded = shieldUntilRef.current > now;
      ctx.fillStyle = shielded ? "#7dd3fc" : "#4fd8c4";
      ctx.beginPath();
      ctx.arc(player.x * CELL + CELL / 2, player.y * CELL + CELL / 2, CELL * 0.34, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "13px sans-serif";
      ctx.textAlign = "right";
      let badgeY = 18;
      if (speedBoostUntilRef.current > now) {
        ctx.fillStyle = "#7ee787";
        ctx.fillText(`Speed ${Math.ceil((speedBoostUntilRef.current - now) / 1000)}s`, canvas.width - 8, badgeY);
        badgeY += 16;
      }
      if (shieldUntilRef.current > now) {
        ctx.fillStyle = "#7dd3fc";
        ctx.fillText(`Shield ${Math.ceil((shieldUntilRef.current - now) / 1000)}s`, canvas.width - 8, badgeY);
      }
    }

    function loop(timestamp) {
      if (statusRef.current === "playing") {
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
      }
      draw(timestamp);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWall, finishRun]);

  return (
    <div className="game-wrap">
      <div className="hud">
        <span>{levelLabel}</span>
        <span>Score {score}</span>
        <span>{"● ".repeat(lives).trim() || "—"}</span>
        <span>Coins left {coinsLeft}</span>
      </div>

      <div className="canvas-shell">
        <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} />
        {status !== "playing" && (
          <div className="overlay">
            {status === "levelComplete" && (
              <>
                <p>Level cleared</p>
                <button onClick={advanceLevel}>Next level</button>
              </>
            )}
            {status === "won" && (
              <>
                <p>All levels cleared — final score {score}</p>
                <button onClick={resetGame}>Play again</button>
              </>
            )}
            {status === "lost" && (
              <>
                <p>Caught by an enemy — final score {score}</p>
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
        Arrow keys, WASD, or the on-screen pad to move. Green power-ups speed you up, blue ones shield you from enemies.
      </p>

      <div className="leaderboard">
        <h2>Top scores</h2>
        {scores.length === 0 ? (
          <p className="hint">No runs yet — finish a game to set the first score.</p>
        ) : (
          <ol>
            {scores.map((entry, i) => (
              <li key={i}>
                <span>{entry.score}</span>
                <span>{entry.date}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
