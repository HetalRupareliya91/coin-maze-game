// Grid-based "waffle" maze: pillars sit on every even (x, y) interior cell,
// with the border always walled off. Because each pillar is a single
// isolated cell, every path cell stays reachable from every other path
// cell -- so coins and enemies dropped anywhere are always collectible.

export const TILE = {
  PATH: 0,
  WALL: 1,
};

export function generateMaze(width, height) {
  const maze = [];

  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const isPillar = x % 2 === 0 && y % 2 === 0;
      row.push(isBorder || isPillar ? TILE.WALL : TILE.PATH);
    }
    maze.push(row);
  }

  return maze;
}

// Opens up specific interior pillar cells to give each level its own room
// shapes. This only ever removes walls, never adds them -- knocking out a
// single isolated pillar can only merge two already-connected regions, so
// the maze stays provably fully connected no matter which pillars a level
// chooses to carve.
export function carveOpenings(maze, coords) {
  const next = maze.map((row) => row.slice());
  for (const [x, y] of coords) {
    if (next[y] && next[y][x] !== undefined) {
      next[y][x] = TILE.PATH;
    }
  }
  return next;
}

// Picks a random open (non-wall) cell, staying inside the border and
// skipping any cell key already present in `exclude`. Falls back to a
// linear scan if random sampling can't find a free cell quickly (e.g. a
// custom level packed with items) so callers never receive a wall cell.
export function randomPathCell(maze, width, height, exclude = new Set()) {
  let x;
  let y;
  let key;
  let attempts = 0;
  do {
    x = 1 + Math.floor(Math.random() * (width - 2));
    y = 1 + Math.floor(Math.random() * (height - 2));
    key = `${x},${y}`;
    attempts += 1;
  } while ((maze[y][x] === TILE.WALL || exclude.has(key)) && attempts < 500);

  if (maze[y][x] !== TILE.WALL && !exclude.has(key)) return { x, y };

  for (let sy = 1; sy < height - 1; sy++) {
    for (let sx = 1; sx < width - 1; sx++) {
      const sKey = `${sx},${sy}`;
      if (maze[sy][sx] !== TILE.WALL && !exclude.has(sKey)) return { x: sx, y: sy };
    }
  }
  throw new Error("randomPathCell: no free cell available on this level");
}
