import { INITIAL_CASH, MAP_HEIGHT, MAP_WIDTH } from '../data/constants';
import { createInitialObjectives } from '../data/objectives';
import type { GameState, TileData } from '../entities/types';

function createBaseTile(): TileData {
  return {
    terrain: 'grass',
    hasPath: false,
    attractionId: null,
    sceneryId: null,
    litter: 0,
  };
}

function carveWater(tiles: TileData[][]): void {
  const centerX = Math.floor(MAP_WIDTH * 0.73);
  const centerY = Math.floor(MAP_HEIGHT * 0.28);

  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const dx = (x - centerX) / 6;
      const dy = (y - centerY) / 4;
      const inPond = dx * dx + dy * dy < 1;
      if (inPond && Math.random() > 0.1) {
        const tile = tiles[y][x];
        tile.terrain = 'water';
        tile.hasPath = false;
      }
    }
  }
}

function layStarterPaths(tiles: TileData[][], entranceX: number, entranceY: number): void {
  for (let x = entranceX; x < entranceX + 10; x += 1) {
    tiles[entranceY][x].hasPath = true;
  }

  for (let y = entranceY - 4; y <= entranceY + 4; y += 1) {
    if (y > 0 && y < MAP_HEIGHT - 1) {
      tiles[y][entranceX + 9].hasPath = true;
    }
  }
}

export function createInitialState(sandboxMode = false): GameState {
  const tiles: TileData[][] = Array.from({ length: MAP_HEIGHT }, () =>
    Array.from({ length: MAP_WIDTH }, () => createBaseTile()),
  );

  carveWater(tiles);

  const entrance = { x: 2, y: Math.floor(MAP_HEIGHT / 2) };
  layStarterPaths(tiles, entrance.x, entrance.y);

  return {
    map: {
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      entrance,
      tiles,
    },
    attractions: {},
    scenery: {},
    guests: {},
    staff: {},
    economy: {
      cash: INITIAL_CASH,
      incomeToday: 0,
      expensesToday: 0,
      totalIncome: 0,
      totalExpenses: 0,
    },
    stats: {
      elapsedSeconds: 0,
      day: 1,
      timeOfDay: 0,
      parkRating: 52,
      sandboxMode,
    },
    notifications: [],
    objectives: createInitialObjectives(),
    selection: {
      type: 'none',
      id: null,
    },
    lastDaySummary: null,
  };
}
