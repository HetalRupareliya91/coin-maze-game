// Each level starts from the same guaranteed-connected base maze
// (see lib/maze.js) and carves open a hand-picked set of pillar cells to
// give it a distinct room layout. Coordinates are [x, y] pillar positions
// (both even, inside the border) in the 17x13 grid.
//
// `presets` gives each level its own tuned Easy/Normal/Hard multipliers
// (see components/CoinMazeGame.jsx's resolveDifficulty), rather than
// applying one flat global multiplier everywhere: a level that's already
// fast-paced at baseline (Level 3) shouldn't get the same aggressive
// "Hard" bump as one that starts out gentle (Level 1), or Hard stops being
// fun rather than just harder.
export const LEVELS = [
  {
    label: "Level 1",
    openExtra: [
      [4, 4], [8, 4], [12, 4],
      [4, 8], [8, 8], [12, 8],
    ],
    coinCount: 14,
    enemyCount: 2,
    powerupCount: 4,
    enemyMoveIntervalMs: 480,
    presets: {
      easy: { enemyCountMult: 0.5, enemySpeedMult: 0.7 },
      normal: { enemyCountMult: 1, enemySpeedMult: 1 },
      hard: { enemyCountMult: 2, enemySpeedMult: 1.4 },
    },
  },
  {
    label: "Level 2",
    openExtra: [
      [2, 6], [6, 2], [10, 6], [14, 2],
      [4, 10], [8, 6], [12, 10],
    ],
    coinCount: 18,
    enemyCount: 3,
    powerupCount: 5,
    enemyMoveIntervalMs: 400,
    presets: {
      easy: { enemyCountMult: 0.67, enemySpeedMult: 0.8 },
      normal: { enemyCountMult: 1, enemySpeedMult: 1 },
      hard: { enemyCountMult: 1.67, enemySpeedMult: 1.3 },
    },
  },
  {
    label: "Level 3",
    openExtra: [
      [2, 2], [2, 10], [14, 2], [14, 10],
      [8, 2], [8, 10], [4, 6], [12, 6],
    ],
    coinCount: 22,
    enemyCount: 4,
    powerupCount: 6,
    enemyMoveIntervalMs: 340,
    presets: {
      easy: { enemyCountMult: 0.5, enemySpeedMult: 0.85 },
      normal: { enemyCountMult: 1, enemySpeedMult: 1 },
      hard: { enemyCountMult: 1.25, enemySpeedMult: 1.15 },
    },
  },
];
