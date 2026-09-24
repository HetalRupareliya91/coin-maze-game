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
  enemies for a few seconds
- Avoid the red enemies — 3 hits and it's game over
- Your top 5 scores are saved locally and shown under the game
- "Play again" starts a fresh run from Level 1 with a new random layout

## How it works

- `lib/maze.js` — generates a guaranteed-solvable base maze (single-cell
  "pillars" on a lattice, so every open cell is always reachable) and
  `carveOpenings`, which knocks out specific pillars to reshape a level.
  Removing an isolated pillar can only merge regions, never split one, so
  the maze stays provably connected however many pillars a level opens up.
- `lib/levels.js` — the 3 level definitions: which pillars each one carves
  open, plus its coin/enemy/power-up counts and enemy speed.
- `lib/leaderboard.js` — a small `localStorage`-backed top-5 high score list.
- `components/CoinMazeGame.jsx` — the game itself: held-direction movement
  (keyboard or the touch D-pad both feed the same mechanism), a
  `requestAnimationFrame` loop that paces movement/enemies and redraws the
  canvas, coin/power-up collection, collision detection, level progression,
  and win/lose state.
- `app/` — the Next.js App Router shell (layout, page, global styles).

Game state that changes every frame (player/enemy positions, active
power-ups) is kept in refs rather than React state, so the render loop
doesn't fight React's re-render cycle. React state (`score`, `lives`,
`status`, the level label, the leaderboard) is only updated when something
the player needs to see on screen actually changes.

## Ideas for extending it further

- A timer / speedrun mode per level
- Sound effects on coin pickup, power-up, and collision
- Smooth pixel-by-pixel movement instead of grid-stepping
- Named entries on the leaderboard instead of just score + date
