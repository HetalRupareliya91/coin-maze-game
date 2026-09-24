// Each level starts from the same guaranteed-connected base maze
// (see lib/maze.js) and carves open a hand-picked set of pillar cells to
// give it a distinct room layout. Coordinates are [x, y] pillar positions
// (both even, inside the border) in the 17x13 grid.
export const LEVELS = [
  {
    label: "Level 1",
    openExtra: [
      [4, 4], [8, 4], [12, 4],
      [4, 8], [8, 8], [12, 8],
    ],
    coinCount: 14,
    enemyCount: 2,
    powerupCount: 2,
    enemyMoveIntervalMs: 480,
  },
  {
    label: "Level 2",
    openExtra: [
      [2, 6], [6, 2], [10, 6], [14, 2],
      [4, 10], [8, 6], [12, 10],
    ],
    coinCount: 18,
    enemyCount: 3,
    powerupCount: 2,
    enemyMoveIntervalMs: 400,
  },
  {
    label: "Level 3",
    openExtra: [
      [2, 2], [2, 10], [14, 2], [14, 10],
      [8, 2], [8, 10], [4, 6], [12, 6],
    ],
    coinCount: 22,
    enemyCount: 4,
    powerupCount: 3,
    enemyMoveIntervalMs: 340,
  },
];
