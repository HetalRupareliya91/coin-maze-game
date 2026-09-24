"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateMaze, TILE, randomPathCell } from "../lib/maze";

const COLS = 17;
const ROWS = 13;
const CELL = 32;
const COIN_COUNT = 18;
const ENEMY_COUNT = 3;
const ENEMY_MOVE_INTERVAL_MS = 450;
const START = { x: 1, y: 1 };
const STARTING_LIVES = 3;

const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

const KEY_TO_DIRECTION = {
  ArrowUp: { dx: 0, dy: -1 },
  w: { dx: 0, dy: -1 },
  W: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  s: { dx: 0, dy: 1 },
  S: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  a: { dx: -1, dy: 0 },
  A: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  d: { dx: 1, dy: 0 },
  D: { dx: 1, dy: 0 },
};

function cellKey(x, y) {
  return `${x},${y}`;
}

function buildLevel() {
  const maze = generateMaze(COLS, ROWS);
  const usedCells = new Set([cellKey(START.x, START.y)]);

  const coins = new Map();
  while (coins.size < COIN_COUNT) {
    const cell = randomPathCell(maze, COLS, ROWS);
    const key = cellKey(cell.x, cell.y);
    if (usedCells.has(key)) continue;
    usedCells.add(key);
    coins.set(key, cell);
  }

  const enemies = [];
  while (enemies.length < ENEMY_COUNT) {
    const cell = randomPathCell(maze, COLS, ROWS);
    const key = cellKey(cell.x, cell.y);
    if (usedCells.has(key)) continue;
    usedCells.add(key);
    enemies.push({
      x: cell.x,
      y: cell.y,
      dir: DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)],
    });
  }

  return { maze, coins, enemies };
}

export default function CoinMazeGame() {
  const canvasRef = useRef(null);
  const levelRef = useRef(buildLevel());
  const playerRef = useRef({ ...START });
  const livesRef = useRef(STARTING_LIVES);
  const statusRef = useRef("playing"); // "playing" | "won" | "lost"
  const lastEnemyMoveRef = useRef(0);
  const rafRef = useRef(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [status, setStatus] = useState("playing");
  const [coinsLeft, setCoinsLeft] = useState(COIN_COUNT);

  const isWall = useCallback((x, y) => {
    const { maze } = levelRef.current;
    if (y < 0 || y >= maze.length || x < 0 || x >= maze[0].length) return true;
    return maze[y][x] === TILE.WALL;
  }, []);

  const resetGame = useCallback(() => {
    levelRef.current = buildLevel();
    playerRef.current = { ...START };
    livesRef.current = STARTING_LIVES;
    statusRef.current = "playing";
    lastEnemyMoveRef.current = 0;
    setScore(0);
    setLives(STARTING_LIVES);
    setStatus("playing");
    setCoinsLeft(COIN_COUNT);
  }, []);

  // Keyboard input: move the player one cell per press.
  useEffect(() => {
    function handleKeyDown(event) {
      if (statusRef.current !== "playing") return;
      const dir = KEY_TO_DIRECTION[event.key];
      if (!dir) return;
      event.preventDefault();

      const player = playerRef.current;
      const nextX = player.x + dir.dx;
      const nextY = player.y + dir.dy;
      if (isWall(nextX, nextY)) return;

      playerRef.current = { x: nextX, y: nextY };

      const { coins } = levelRef.current;
      const key = cellKey(nextX, nextY);
      if (coins.has(key)) {
        coins.delete(key);
        setScore((prev) => prev + 10);
        setCoinsLeft(coins.size);
        if (coins.size === 0) {
          statusRef.current = "won";
          setStatus("won");
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWall]);

  // Render + enemy-AI loop.
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

    function checkEnemyCollision() {
      const player = playerRef.current;
      const hit = levelRef.current.enemies.some((e) => e.x === player.x && e.y === player.y);
      if (!hit) return;

      livesRef.current -= 1;
      if (livesRef.current <= 0) {
        statusRef.current = "lost";
        setStatus("lost");
        setLives(0);
      } else {
        playerRef.current = { ...START };
        setLives(livesRef.current);
      }
    }

    function draw() {
      const { maze, coins, enemies } = levelRef.current;

      ctx.fillStyle = "#1b1035";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#4a3f7a";
      for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[0].length; x++) {
          if (maze[y][x] === TILE.WALL) {
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          }
        }
      }

      ctx.fillStyle = "#ffcf5c";
      for (const coin of coins.values()) {
        ctx.beginPath();
        ctx.arc(coin.x * CELL + CELL / 2, coin.y * CELL + CELL / 2, CELL * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#ff6b6b";
      for (const enemy of enemies) {
        ctx.beginPath();
        ctx.arc(enemy.x * CELL + CELL / 2, enemy.y * CELL + CELL / 2, CELL * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }

      const player = playerRef.current;
      ctx.fillStyle = "#4fd8c4";
      ctx.beginPath();
      ctx.arc(player.x * CELL + CELL / 2, player.y * CELL + CELL / 2, CELL * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }

    function loop(timestamp) {
      if (statusRef.current === "playing" && timestamp - lastEnemyMoveRef.current > ENEMY_MOVE_INTERVAL_MS) {
        moveEnemies();
        checkEnemyCollision();
        lastEnemyMoveRef.current = timestamp;
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isWall]);

  return (
    <div className="game-wrap">
      <div className="hud">
        <span>Score {score}</span>
        <span>{"● ".repeat(lives).trim() || "—"}</span>
        <span>Coins left {coinsLeft}</span>
      </div>

      <div className="canvas-shell">
        <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} />
        {status !== "playing" && (
          <div className="overlay">
            <p>{status === "won" ? "All coins collected" : "Caught by an enemy"}</p>
            <button onClick={resetGame}>Play again</button>
          </div>
        )}
      </div>

      <p className="hint">Arrow keys or WASD to move. Gold circles are coins, red circles hurt.</p>
    </div>
  );
}
