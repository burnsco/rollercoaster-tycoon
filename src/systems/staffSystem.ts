import type {
  AttractionDefinition,
  GameState,
  NotificationKind,
  Point,
  StaffMember,
  StaffType,
} from '../entities/types';
import { createId } from '../utils/id';
import { STAFF_DEFAULT_WAGE } from '../data/constants';
import { findPath } from './pathfinding';
import { manhattanDistance } from './grid';

interface StaffSystemDeps {
  attractionById: Record<string, AttractionDefinition>;
  notify: (message: string, kind?: NotificationKind) => void;
}

const STAFF_MOVE_SPEED = 3.0;

export function hireStaff(state: GameState, type: StaffType): string {
  const id = createId(type);
  state.staff[id] = {
    id,
    type,
    tile: { ...state.map.entrance },
    path: [],
    state: 'idle',
    targetAttractionId: null,
    targetTile: null,
    workTimer: 0,
    wage: STAFF_DEFAULT_WAGE[type],
  };

  return id;
}

export function updateStaff(state: GameState, dt: number, deps: StaffSystemDeps): void {
  for (const staff of Object.values(state.staff)) {
    if (staff.state === 'moving') {
      moveStaff(staff, dt);
      if (staff.path.length === 0) {
        if (staff.type === 'mechanic' && staff.targetAttractionId) {
          const attraction = state.attractions[staff.targetAttractionId];
          if (attraction && attraction.broken) {
            staff.state = 'repairing';
            staff.workTimer = 8 + Math.random() * 4;
          } else {
            staff.state = 'idle';
            staff.targetAttractionId = null;
          }
        } else if (staff.type === 'janitor' && staff.targetTile) {
          staff.state = 'cleaning';
          staff.workTimer = 3;
        } else {
          staff.state = 'idle';
        }
      }
    } else if (staff.state === 'repairing') {
      staff.workTimer -= dt;
      if (staff.workTimer <= 0) {
        const attraction = staff.targetAttractionId ? state.attractions[staff.targetAttractionId] : null;
        if (attraction) {
          attraction.broken = false;
          attraction.open = true;
          attraction.repairAssigned = false;
          deps.notify(`${attraction.name} was repaired.`, 'info');
        }
        staff.state = 'idle';
        staff.targetAttractionId = null;
      }
    } else if (staff.state === 'cleaning') {
      staff.workTimer -= dt;
      if (staff.workTimer <= 0) {
        if (staff.targetTile) {
          cleanNearbyTiles(state, staff.targetTile);
        }
        staff.state = 'idle';
        staff.targetTile = null;
      }
    }

    if (staff.state === 'idle') {
      assignWork(state, staff.id);
    }
  }
}

function moveStaff(staff: StaffMember, dt: number): void {
  staff.workTimer += dt * STAFF_MOVE_SPEED;

  while (staff.workTimer >= 1 && staff.path.length > 0) {
    const next = staff.path.shift();
    if (!next) {
      break;
    }
    staff.tile = next;
    staff.workTimer -= 1;
  }
}

function assignWork(state: GameState, staffId: string): void {
  const staff = state.staff[staffId];
  if (!staff) {
    return;
  }

  if (staff.type === 'mechanic') {
    const target = findBrokenAttractionForMechanic(state, staff.tile);
    if (!target) {
      return;
    }

    const path = findPath(state.map, staff.tile, target.accessTile);
    if (path.length === 0) {
      return;
    }

    target.repairAssigned = true;
    staff.path = path;
    staff.state = 'moving';
    staff.targetAttractionId = target.id;
    staff.workTimer = 0;
    return;
  }

  const dirtyTile = findDirtiestPathTile(state);
  if (!dirtyTile) {
    return;
  }

  const path = findPath(state.map, staff.tile, dirtyTile);
  if (path.length === 0) {
    return;
  }

  staff.path = path;
  staff.targetTile = dirtyTile;
  staff.state = 'moving';
  staff.workTimer = 0;
}

function findBrokenAttractionForMechanic(state: GameState, from: Point) {
  return Object.values(state.attractions)
    .filter((attraction) => attraction.broken && !attraction.repairAssigned)
    .sort(
      (a, b) =>
        manhattanDistance(from, a.accessTile) - manhattanDistance(from, b.accessTile),
    )[0];
}

function findDirtiestPathTile(state: GameState): Point | null {
  let best: Point | null = null;
  let litter = 28;

  for (let y = 0; y < state.map.height; y += 1) {
    for (let x = 0; x < state.map.width; x += 1) {
      const tile = state.map.tiles[y][x];
      if (!tile.hasPath) {
        continue;
      }
      if (tile.litter > litter) {
        litter = tile.litter;
        best = { x, y };
      }
    }
  }

  return best;
}

function cleanNearbyTiles(state: GameState, center: Point): void {
  for (let y = center.y - 1; y <= center.y + 1; y += 1) {
    for (let x = center.x - 1; x <= center.x + 1; x += 1) {
      if (x < 0 || y < 0 || x >= state.map.width || y >= state.map.height) {
        continue;
      }
      const tile = state.map.tiles[y][x];
      if (tile.hasPath) {
        tile.litter = Math.max(0, tile.litter - 65);
      }
    }
  }
}
