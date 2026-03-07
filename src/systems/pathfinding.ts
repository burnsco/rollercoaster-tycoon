import type { MapState, Point } from '../entities/types';
import { isWalkablePathTile, neighbors4 } from './grid';

export function findPath(map: MapState, start: Point, goal: Point): Point[] {
  if (start.x === goal.x && start.y === goal.y) {
    return [];
  }

  if (!isWalkablePathTile(map, start) || !isWalkablePathTile(map, goal)) {
    return [];
  }

  const width = map.width;
  const total = map.width * map.height;
  const visited = new Uint8Array(total);
  const parent = new Int32Array(total);
  parent.fill(-1);

  const queue: Point[] = [start];
  const startIndex = indexFor(width, start.x, start.y);
  const goalIndex = indexFor(width, goal.x, goal.y);
  visited[startIndex] = 1;

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    const currentIndex = indexFor(width, current.x, current.y);

    for (const neighbor of neighbors4(map, current)) {
      const nextIndex = indexFor(width, neighbor.x, neighbor.y);
      if (visited[nextIndex] || !isWalkablePathTile(map, neighbor)) {
        continue;
      }
      visited[nextIndex] = 1;
      parent[nextIndex] = currentIndex;
      if (nextIndex === goalIndex) {
        return reconstructPath(parent, width, startIndex, goalIndex);
      }
      queue.push(neighbor);
    }
  }

  return [];
}

function indexFor(width: number, x: number, y: number): number {
  return y * width + x;
}

function reconstructPath(parent: Int32Array, width: number, startIndex: number, goalIndex: number): Point[] {
  const path: Point[] = [];
  let cursor = goalIndex;

  while (cursor !== startIndex && cursor >= 0) {
    const x = cursor % width;
    const y = Math.floor(cursor / width);
    path.push({ x, y });
    cursor = parent[cursor];
  }

  path.reverse();
  return path;
}
