# Coin Maze

A small top-down coin-collecting maze game, built with Next.js and a plain
HTML5 canvas (no game engine, no external libraries).

## How to run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Controls

- Arrow keys, WASD, or the on-screen D-pad (shown automatically on touch
  devices) to move — hold a direction to keep moving
- Collect every gold coin to clear a level; there are 3 levels
- Green power-ups give a temporary speed boost; blue ones shield you from
  enemies; pink grants an extra life (up to 5); purple is a coin magnet
  that auto-collects nearby coins for a few seconds
- Avoid the red enemies — 3 hits and it's game over
- A speedrun timer runs while you play and pauses on every non-playing
  screen, so level-clear and game-over pauses don't count against you
- Your best clear time per level is tracked separately and shown below
  the score leaderboard
- When a run ends, type a name and save your score — top 5 (name, score,
  time) are kept in `localStorage`
- "Play again" starts a fresh run from Level 1 with a new random layout
- Movement glides smoothly between cells (for both you and the enemies)
  instead of snapping instantly — the underlying game logic is still
  grid-based, only the rendering is interpolated

## How it works

- `lib/maze.js` — generates a guaranteed-solvable base maze (single-cell
  "pillars" on a lattice, so every open cell is always reachable) and
  `carveOpenings`, which knocks out specific pillars to reshape a level.
  Removing an isolated pillar can only merge regions, never split one, so
  the maze stays provably connected however many pillars a level opens up.
- `lib/levels.js` — the 3 level definitions: which pillars each one carves
  open, plus its coin/enemy/power-up counts and enemy speed.
- `lib/leaderboard.js` — a `localStorage`-backed top-5 high score list
  (`name`, `score`, `timeMs`), a remembered last-used name, and a per-level
  best-time record.
- `lib/sound.js` — short Web Audio API oscillator tones for pickups, each
  power-up type, hits, and level/game outcomes — no audio files to load.
- `components/CoinMazeGame.jsx` — the game itself: held-direction movement
  (keyboard or the touch D-pad both feed the same mechanism), a
  `requestAnimationFrame` loop that paces movement/enemies/the timer,
  smooths player and enemy render positions, and redraws the canvas,
  coin/power-up collection (including the magnet's proximity auto-collect),
  collision detection, level progression, and win/lose state.
- `app/` — the Next.js App Router shell (layout, page, global styles).

Game state that changes every frame (player/enemy logical *and* rendered
positions, active power-ups, the running timer) is kept in refs rather
than React state, so the render loop doesn't fight React's re-render
cycle. React state (`score`, `lives`, `status`, the level label, the
leaderboard, best times) is only updated when something the player needs
to see on screen actually changes.

Movement stays grid-based for all logic (collisions, coin pickup, walls):
`playerRef`/`enemy.x,y` are always whole cells. A second position
(`playerRenderRef`/`enemy.renderX,renderY`) chases the logical position
every frame using frame-rate-independent exponential smoothing
(`1 - Math.exp(-dt * rate)`), and only that smoothed position is drawn —
so the game feels fluid without any of the grid logic having to change.

## Ideas for extending it further

- A shared/online leaderboard instead of per-browser `localStorage`
- More power-up types (temporary invincibility-through-walls, bomb)
- A minimap or fog-of-war for the larger levels
- Difficulty settings (enemy count/speed sliders)
