import type { RectSize, SceneryType } from '../entities/types';

export interface SceneryDefinition {
  id: SceneryType;
  name: string;
  buildCost: number;
  footprint: RectSize;
  color: string;
  comfort: number;
  cleanlinessSupport: number;
}

export const SCENERY_DEFINITIONS: SceneryDefinition[] = [
  {
    id: 'tree',
    name: 'Tree',
    buildCost: 45,
    footprint: { width: 1, height: 1 },
    color: '#4fa55e',
    comfort: 8,
    cleanlinessSupport: 0,
  },
  {
    id: 'bench',
    name: 'Bench',
    buildCost: 55,
    footprint: { width: 1, height: 1 },
    color: '#8e6b4c',
    comfort: 14,
    cleanlinessSupport: 0,
  },
  {
    id: 'bin',
    name: 'Bin',
    buildCost: 35,
    footprint: { width: 1, height: 1 },
    color: '#4a6685',
    comfort: 4,
    cleanlinessSupport: 22,
  },
  {
    id: 'flowerbed',
    name: 'Flower Bed',
    buildCost: 40,
    footprint: { width: 1, height: 1 },
    color: '#d486c3',
    comfort: 10,
    cleanlinessSupport: 0,
  },
];

export const SCENERY_BY_ID = Object.fromEntries(
  SCENERY_DEFINITIONS.map((item) => [item.id, item]),
) as Record<SceneryType, SceneryDefinition>;
