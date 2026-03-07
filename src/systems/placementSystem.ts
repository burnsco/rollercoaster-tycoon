import type { SceneryDefinition } from '../data/scenery';
import { createId } from '../utils/id';
import type {
  AttractionDefinition,
  BuildTool,
  GameState,
  PlacementResult,
  PlacementValidation,
  Point,
  SceneryType,
} from '../entities/types';
import { inBounds, neighbors4 } from './grid';

interface PlacementDeps {
  attractionById: Record<string, AttractionDefinition>;
  sceneryById: Record<SceneryType, SceneryDefinition>;
}

export function getPlacementFootprint(
  tool: BuildTool,
  deps: PlacementDeps,
): { width: number; height: number } {
  if (tool.kind === 'attraction') {
    return deps.attractionById[tool.definitionId]?.footprint ?? { width: 1, height: 1 };
  }
  if (tool.kind === 'scenery') {
    return deps.sceneryById[tool.sceneryType]?.footprint ?? { width: 1, height: 1 };
  }
  return { width: 1, height: 1 };
}

export function validatePlacement(
  state: GameState,
  tool: BuildTool,
  origin: Point,
  deps: PlacementDeps,
): PlacementValidation {
  if (!inBounds(state.map, origin)) {
    return { valid: false, reason: 'Out of bounds.' };
  }

  if (tool.kind === 'inspect') {
    return { valid: true };
  }

  if (tool.kind === 'path') {
    const tile = state.map.tiles[origin.y][origin.x];
    if (tile.terrain === 'water') {
      return { valid: false, reason: 'Cannot place path on water.' };
    }
    if (tile.hasPath) {
      return { valid: false, reason: 'Path already exists.' };
    }
    if (tile.attractionId || tile.sceneryId) {
      return { valid: false, reason: 'Tile is occupied.' };
    }
    return { valid: true };
  }

  if (tool.kind === 'demolish') {
    const tile = state.map.tiles[origin.y][origin.x];
    if (!tile.hasPath && !tile.attractionId && !tile.sceneryId) {
      return { valid: false, reason: 'Nothing to demolish.' };
    }
    return { valid: true };
  }

  if (tool.kind === 'scenery') {
    const scenery = deps.sceneryById[tool.sceneryType];
    if (!scenery) {
      return { valid: false, reason: 'Unknown scenery item.' };
    }
    const area = getArea(origin, scenery.footprint.width, scenery.footprint.height);

    for (const point of area) {
      if (!inBounds(state.map, point)) {
        return { valid: false, reason: 'Placement out of bounds.' };
      }
      const tile = state.map.tiles[point.y][point.x];
      if (tile.terrain === 'water' || tile.hasPath || tile.attractionId || tile.sceneryId) {
        return { valid: false, reason: 'Scenery must be placed on empty grass.' };
      }
    }

    return { valid: true };
  }

  if (tool.kind === 'attraction') {
    const definition = deps.attractionById[tool.definitionId];
    if (!definition) {
      return { valid: false, reason: 'Unknown attraction.' };
    }

    const area = getArea(origin, definition.footprint.width, definition.footprint.height);
    for (const point of area) {
      if (!inBounds(state.map, point)) {
        return { valid: false, reason: 'Placement out of bounds.' };
      }
      const tile = state.map.tiles[point.y][point.x];
      if (tile.terrain === 'water' || tile.hasPath || tile.attractionId || tile.sceneryId) {
        return { valid: false, reason: 'Attraction footprint must be empty grass.' };
      }
    }

    const accessTile = findAccessTile(state, area);
    if (!accessTile) {
      return { valid: false, reason: 'Attraction needs a path connection.' };
    }

    return { valid: true, accessTile };
  }

  return { valid: false, reason: 'Unsupported tool.' };
}

export function applyPlacement(
  state: GameState,
  tool: BuildTool,
  origin: Point,
  deps: PlacementDeps,
): PlacementResult {
  const validation = validatePlacement(state, tool, origin, deps);
  if (!validation.valid) {
    return { success: false, reason: validation.reason };
  }

  if (tool.kind === 'inspect') {
    return { success: false, reason: 'Inspect does not place objects.' };
  }

  if (tool.kind === 'path') {
    state.map.tiles[origin.y][origin.x].hasPath = true;
    return { success: true };
  }

  if (tool.kind === 'demolish') {
    const tile = state.map.tiles[origin.y][origin.x];

    if (tile.attractionId) {
      const removedId = tile.attractionId;
      removeAttraction(state, removedId);
      return { success: true, removedAttractionId: removedId };
    }

    if (tile.sceneryId) {
      removeScenery(state, tile.sceneryId);
      return { success: true };
    }

    if (tile.hasPath && !isEntranceTile(state, origin)) {
      tile.hasPath = false;
      tile.litter = 0;
      return { success: true };
    }

    return { success: false, reason: 'Cannot demolish park entrance.' };
  }

  if (tool.kind === 'scenery') {
    const scenery = deps.sceneryById[tool.sceneryType];
    if (!scenery) {
      return { success: false, reason: 'Unknown scenery.' };
    }

    const sceneryId = createId('scenery');
    for (const point of getArea(origin, scenery.footprint.width, scenery.footprint.height)) {
      state.map.tiles[point.y][point.x].sceneryId = sceneryId;
    }
    state.scenery[sceneryId] = {
      id: sceneryId,
      type: tool.sceneryType,
      origin: { ...origin },
      footprint: { ...scenery.footprint },
    };
    return { success: true };
  }

  if (tool.kind === 'attraction') {
    const definition = deps.attractionById[tool.definitionId];
    if (!definition || !validation.accessTile) {
      return { success: false, reason: 'Invalid attraction placement.' };
    }

    const attractionId = createId('attraction');
    const instance = {
      id: attractionId,
      definitionId: definition.id,
      category: definition.category,
      name: definition.name,
      origin: { ...origin },
      footprint: { ...definition.footprint },
      accessTile: { ...validation.accessTile },
      open: true,
      ticketPrice: definition.defaultTicketPrice,
      maxQueue: definition.maxQueue,
      queue: [] as string[],
      riders: [] as string[],
      cycleTimer: definition.cycleDuration,
      broken: false,
      repairAssigned: false,
      timesBroken: 0,
      uptime: 0,
      downtime: 0,
    };

    state.attractions[attractionId] = instance;

    for (const point of getArea(origin, definition.footprint.width, definition.footprint.height)) {
      state.map.tiles[point.y][point.x].attractionId = attractionId;
    }

    return { success: true };
  }

  return { success: false, reason: 'Unsupported placement.' };
}

export function getBuildCost(tool: BuildTool, deps: PlacementDeps): number {
  if (tool.kind === 'path') {
    return 8;
  }
  if (tool.kind === 'attraction') {
    return deps.attractionById[tool.definitionId]?.buildCost ?? 0;
  }
  if (tool.kind === 'scenery') {
    return deps.sceneryById[tool.sceneryType]?.buildCost ?? 0;
  }
  return 0;
}

function findAccessTile(state: GameState, area: Point[]): Point | null {
  const areaSet = new Set(area.map((point) => `${point.x},${point.y}`));

  for (const point of area) {
    const adjacent = neighbors4(state.map, point);
    for (const neighbor of adjacent) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (areaSet.has(key)) {
        continue;
      }
      const tile = state.map.tiles[neighbor.y][neighbor.x];
      if (tile.hasPath) {
        return { ...neighbor };
      }
    }
  }

  return null;
}

function isEntranceTile(state: GameState, point: Point): boolean {
  return point.x === state.map.entrance.x && point.y === state.map.entrance.y;
}

function removeAttraction(state: GameState, attractionId: string): void {
  for (let y = 0; y < state.map.height; y += 1) {
    for (let x = 0; x < state.map.width; x += 1) {
      const tile = state.map.tiles[y][x];
      if (tile.attractionId === attractionId) {
        tile.attractionId = null;
      }
    }
  }
  delete state.attractions[attractionId];
}

function removeScenery(state: GameState, sceneryId: string): void {
  for (let y = 0; y < state.map.height; y += 1) {
    for (let x = 0; x < state.map.width; x += 1) {
      const tile = state.map.tiles[y][x];
      if (tile.sceneryId === sceneryId) {
        tile.sceneryId = null;
      }
    }
  }
  delete state.scenery[sceneryId];
}

function getArea(origin: Point, width: number, height: number): Point[] {
  const area: Point[] = [];
  for (let y = origin.y; y < origin.y + height; y += 1) {
    for (let x = origin.x; x < origin.x + width; x += 1) {
      area.push({ x, y });
    }
  }
  return area;
}
