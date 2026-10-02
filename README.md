# Coin Maze

A small top-down coin-collecting maze game, built with Next.js and a plain
HTML5 canvas (no game engine, no external libraries).

## How to run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Optional: for a shared leaderboard that persists on any host (including
serverless), copy `.env.example` to `.env.local` and set `DATABASE_URL` to
a Postgres connection string (a free tier from Neon, Supabase, or Railway
all work fine). Without it, the app still works — it just uses a JSON file
locally, or per-device `localStorage` if even that isn't writable.

## Controls

- Arrow keys, WASD, or the on-screen D-pad (shown automatically on touch
  devices) to move — hold a direction to keep moving
- Collect every gold coin to clear a level; there are 3 levels
- Green power-ups give a temporary speed boost; blue ones shield you from
  enemies; pink grants an extra life (up to 5); purple is a coin magnet
  that auto-collects nearby coins for a few seconds; orange is a bomb that
  instantly clears every enemy on the level; gold makes you invincible for
  a few seconds — touch an enemy while invincible to destroy it for bonus
  points instead of taking damage; cyan drops a decoy that nearby enemies
  chase instead of wandering, buying you a window to slip past them
- Avoid the red enemies otherwise — 3 hits and it's game over
- Easy/Normal/Hard difficulty presets are tuned per level (Level 3's
  baseline is already fast, so its "Hard" is a smaller bump than Level 1's)
  rather than one flat multiplier everywhere; pick "Custom" for raw
  enemy-count/speed sliders applied the same on every level instead
- Fog of war (toggleable) reveals the maze in a gently pulsing radius
  around you, with a soft-edged glow rather than a hard circle; cells
  you've already seen stay dimly visible, unexplored ones stay dark
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
  leaderboard. The API route uses Postgres (`lib/db/postgres.js`) when a
  `DATABASE_URL` env var is set (see `.env.example`), otherwise it falls
  back to a JSON file (`data/leaderboard.json`, git-ignored). The client
  wrapper resolves to `null` on any failure so the app can fall back
  further, to the per-device `lib/leaderboard.js` store, if neither backend
  is reachable. The JSON-file path only persists on a host with a writable
  filesystem at runtime (a VPS, or `next start` on your own server) —
  typical serverless deployments have a read-only filesystem in production,
  so setting `DATABASE_URL` to any hosted Postgres (Neon, Supabase, Railway,
  etc. all have free tiers) is what makes the shared leaderboard actually
  persist there.
- `lib/settings.js` — `localStorage`-backed difficulty settings: enemy
  count/speed multipliers and a fog-of-war toggle.
- `lib/sound.js` — short Web Audio API oscillator tones for pickups, each
  power-up type, hits, and level/game outcomes — no audio files to load.
- `components/CoinMazeGame.jsx` — the game itself: held-direction movement
  (keyboard or the touch D-pad both feed the same mechanism), a
  `requestAnimationFrame` loop that paces movement/enemies/the timer,
  smooths player and enemy render positions, tracks which cells have been
  revealed for the fog-of-war overlay, and redraws the canvas,
  coin/power-up collection (including the magnet's proximity auto-collect),
  collision detection (including invincibility's enemy-destroying variant),
  level progression, and win/lose state.
- `app/` — the Next.js App Router shell (layout, page, global styles, and
  the leaderboard API route under `app/api/`).

Game state that changes every frame (player/enemy logical *and* rendered
positions, active power-ups, the running timer, which cells are revealed)
is kept in refs rather than React state, so the render loop doesn't fight
React's re-render cycle. React state (`score`, `lives`, `status`, the level
label, the leaderboard, best times, settings) is only updated when
something the player needs to see on screen actually changes.

Movement stays grid-based for all logic (collisions, coin pickup, walls):
`playerRef`/`enemy.x,y` are always whole cells. A second position
(`playerRenderRef`/`enemy.renderX,renderY`) chases the logical position
every frame using frame-rate-independent exponential smoothing
(`1 - Math.exp(-dt * rate)`), and only that smoothed position is drawn —
so the game feels fluid without any of the grid logic having to change.

Fog of war works the same way conceptually: each level keeps a `revealed`
array (one flag per cell). Every frame, any cell within `VISIBILITY_RADIUS`
of the player's smoothed position is marked revealed, permanently. When
drawing, cells outside that radius get a dark overlay — nearly opaque if
never revealed, semi-transparent (dimly "remembered") if they have been.
Turning the setting off just skips drawing that overlay; nothing about the
underlying maze data changes.

## Ideas for extending it further

- More power-up types (a decoy, a brief maze-wide light pulse)
- A gentle light-radius pulse tied to the timer, for atmosphere
- Per-level difficulty presets tuned specifically to each level's layout
