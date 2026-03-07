import type { MapState, Point } from '../entities/types';

export function inBounds(map: MapState, point: Point): boolean {
  return point.x >= 0 && point.y >= 0 && point.x < map.width && point.y < map.height;
}

export function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y };
}

export function manhattanDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function neighbors4(map: MapState, point: Point): Point[] {
  const candidates: Point[] = [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ];

  return candidates.filter((candidate) => inBounds(map, candidate));
}

export function isWalkablePathTile(map: MapState, point: Point): boolean {
  if (!inBounds(map, point)) {
    return false;
  }
  const tile = map.tiles[point.y][point.x];
  return tile.hasPath && tile.terrain !== 'water';
}
