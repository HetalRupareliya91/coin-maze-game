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
  that auto-collects nearby coins for a few seconds; orange is a bomb that
  instantly clears every enemy on the level; gold makes you invincible for
  a few seconds — touch an enemy while invincible to destroy it for bonus
  points instead of taking damage
- Avoid the red enemies otherwise — 3 hits and it's game over
- Difficulty sliders let you scale enemy count and enemy speed; changes
  apply from the next level or a fresh game, not mid-level
- A speedrun timer runs while you play and pauses on every non-playing
  screen, so level-clear and game-over pauses don't count against you
- Your best clear time per level is tracked separately and shown below
  the score leaderboard
- When a run ends, type a name and save your score — the app tries a
  shared online leaderboard first, and falls back to a per-device one
  (`localStorage`) if that's unavailable; either way the top 10 (name,
  score, time) are kept
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
- `lib/leaderboard.js` — the per-device (`localStorage`) fallback: top-10
  high score list (`name`, `score`, `timeMs`), a remembered last-used name,
  and a per-level best-time record.
- `lib/onlineLeaderboard.js` + `app/api/leaderboard/route.js` — a shared
  leaderboard: a small Next.js API route backed by a JSON file
  (`data/leaderboard.json`, git-ignored), with a client wrapper that
  resolves to `null` on any failure so the app can fall back to
  `lib/leaderboard.js` automatically. **Caveat:** the JSON-file write only
  persists on a host with a writable filesystem at runtime (a VPS, or
  `next start` on your own server). Typical serverless deployments (e.g. a
  default Vercel deployment) have a read-only filesystem in production, so
  writes there won't persist between requests — the app still works, it
  just quietly falls back to the local leaderboard in that case. Swapping
  in a real database (e.g. a hosted Postgres/SQLite/Redis) behind this same
  API route would make it persist everywhere.
- `lib/settings.js` — `localStorage`-backed difficulty multipliers (enemy
  count, enemy speed).
- `lib/sound.js` — short Web Audio API oscillator tones for pickups, each
  power-up type, hits, and level/game outcomes — no audio files to load.
- `components/CoinMazeGame.jsx` — the game itself: held-direction movement
  (keyboard or the touch D-pad both feed the same mechanism), a
  `requestAnimationFrame` loop that paces movement/enemies/the timer,
  smooths player and enemy render positions, and redraws the canvas,
  coin/power-up collection (including the magnet's proximity auto-collect),
  collision detection (including invincibility's enemy-destroying variant),
  level progression, and win/lose state.
- `app/` — the Next.js App Router shell (layout, page, global styles, and
  the leaderboard API route under `app/api/`).

Game state that changes every frame (player/enemy logical *and* rendered
positions, active power-ups, the running timer) is kept in refs rather
than React state, so the render loop doesn't fight React's re-render
cycle. React state (`score`, `lives`, `status`, the level label, the
leaderboard, best times, settings) is only updated when something the
player needs to see on screen actually changes.

Movement stays grid-based for all logic (collisions, coin pickup, walls):
`playerRef`/`enemy.x,y` are always whole cells. A second position
(`playerRenderRef`/`enemy.renderX,renderY`) chases the logical position
every frame using frame-rate-independent exponential smoothing
(`1 - Math.exp(-dt * rate)`), and only that smoothed position is drawn —
so the game feels fluid without any of the grid logic having to change.

## Ideas for extending it further

- A real database behind the shared leaderboard so it persists on any host
- More power-up types (a minimap reveal, a decoy)
- A minimap or fog-of-war for the larger levels
- Difficulty presets (Easy/Normal/Hard) in addition to the raw sliders
