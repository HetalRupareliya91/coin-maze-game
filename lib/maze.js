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

// Picks a random open (non-wall) cell, staying inside the border.
export function randomPathCell(maze, width, height) {
  let x;
  let y;
  do {
    x = 1 + Math.floor(Math.random() * (width - 2));
    y = 1 + Math.floor(Math.random() * (height - 2));
  } while (maze[y][x] === TILE.WALL);
  return { x, y };
}
