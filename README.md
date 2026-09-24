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

- Arrow keys or WASD to move
- Collect every gold coin to win
- Avoid the red enemies — 3 hits and it's game over
- "Play again" generates a brand-new maze layout

## How it works

- `lib/maze.js` — generates a guaranteed-solvable grid maze (single-cell
  "pillars" on a lattice, so every open cell is always reachable).
- `components/CoinMazeGame.jsx` — the whole game: keyboard-driven player
  movement, a `requestAnimationFrame` loop that moves enemies and redraws
  the canvas, coin collection, collision detection, win/lose state.
- `app/` — the Next.js App Router shell (layout, page, global styles).

Game state that changes every frame (player/enemy positions) is kept in
refs rather than React state, so the render loop doesn't fight React's
re-render cycle. React state (`score`, `lives`, `status`) is only updated
when something the player needs to see on screen actually changes.

## Ideas for extending it

- Multiple hand-designed levels instead of a random maze
- A timer / high-score leaderboard (`localStorage`)
- Power-ups (speed boost, temporary invincibility)
- Smooth pixel-by-pixel movement instead of grid-stepping
- Sound effects on coin pickup / collision
