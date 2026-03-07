import { ATTRACTION_BY_ID } from '../data/attractions';
import { SCENERY_BY_ID } from '../data/scenery';
import type { BuildTool, PlacementValidation, Point, UISnapshot } from '../entities/types';
import { getPlacementFootprint } from '../systems/placementSystem';
import { CanvasRenderer } from './CanvasRenderer';
import { GameLoop } from './GameLoop';
import { Simulation } from '../simulation/Simulation';

export class GameController {
  private readonly canvas: HTMLCanvasElement;
  private readonly simulation: Simulation;
  private readonly renderer: CanvasRenderer;
  private readonly loop: GameLoop;

  private readonly listeners = new Set<(snapshot: UISnapshot) => void>();

  private tool: BuildTool = { kind: 'inspect' };
  private hoveredTile: Point | null = null;
  private placementValidation: PlacementValidation | null = null;
  private previewSize = { width: 1, height: 1 };

  private uiEmitTimer = 0;
  private isRightDragging = false;
  private dragLast = { x: 0, y: 0 };
  private keys = new Set<string>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.simulation = new Simulation();
    this.renderer = new CanvasRenderer(this.canvas, {
      attractionById: ATTRACTION_BY_ID,
    });
    this.loop = new GameLoop(this.update, this.render);
    this.placementValidation = this.simulation.getPlacementValidation(this.tool, null);
    this.previewSize = this.simulation.getToolFootprint(this.tool);
    this.bindInput();
  }

  start(): void {
    this.loop.start();
    this.emitSnapshot();
  }

  stop(): void {
    this.loop.stop();
    this.unbindInput();
    this.simulation.save();
  }

  subscribe(listener: (snapshot: UISnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.simulation.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getTool(): BuildTool {
    return this.tool;
  }

  setTool(tool: BuildTool): void {
    this.tool = tool;
    this.previewSize = this.simulation.getToolFootprint(tool);
    this.placementValidation = this.simulation.getPlacementValidation(this.tool, this.hoveredTile);
    this.emitSnapshot();
  }

  setAttractionOpen(attractionId: string, open: boolean): void {
    this.simulation.setAttractionOpen(attractionId, open);
    this.emitSnapshot();
  }

  setAttractionPrice(attractionId: string, nextPrice: number): void {
    this.simulation.setAttractionPrice(attractionId, nextPrice);
    this.emitSnapshot();
  }

  hireJanitor(): void {
    this.simulation.hire('janitor');
    this.emitSnapshot();
  }

  hireMechanic(): void {
    this.simulation.hire('mechanic');
    this.emitSnapshot();
  }

  setSandboxMode(enabled: boolean): void {
    this.simulation.setSandboxMode(enabled);
    this.emitSnapshot();
  }

  saveNow(): void {
    this.simulation.save();
    this.emitSnapshot();
  }

  private update = (dt: number): void => {
    this.simulation.update(dt);
    this.renderer.camera.updateFromKeys(this.keys, dt);

    if (this.hoveredTile) {
      this.placementValidation = this.simulation.getPlacementValidation(this.tool, this.hoveredTile);
    }

    this.uiEmitTimer += dt;
    if (this.uiEmitTimer > 0.2) {
      this.uiEmitTimer = 0;
      this.emitSnapshot();
    }
  };

  private render = (): void => {
    this.renderer.render(this.simulation.getState(), {
      tool: this.tool,
      hoveredTile: this.hoveredTile,
      placementValidation: this.placementValidation,
      previewSize: this.previewSize,
      selection: this.simulation.getState().selection,
    });
  };

  private bindInput(): void {
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.onContextMenu);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private unbindInput(): void {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private emitSnapshot(): void {
    const snapshot = this.simulation.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (this.isRightDragging) {
      const dx = event.clientX - this.dragLast.x;
      const dy = event.clientY - this.dragLast.y;
      this.dragLast = { x: event.clientX, y: event.clientY };
      this.renderer.camera.pan(dx, dy);
      return;
    }

    const tile = this.renderer.screenToTile(event.clientX, event.clientY);
    if (!this.hoveredTile || tile.x !== this.hoveredTile.x || tile.y !== this.hoveredTile.y) {
      this.hoveredTile = tile;
      this.placementValidation = this.simulation.getPlacementValidation(this.tool, tile);
    }
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button === 2) {
      this.isRightDragging = true;
      this.dragLast = { x: event.clientX, y: event.clientY };
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const tile = this.renderer.screenToTile(event.clientX, event.clientY);
    this.hoveredTile = tile;

    if (this.tool.kind === 'inspect') {
      this.simulation.selectAtTile(tile);
      this.emitSnapshot();
      return;
    }

    this.simulation.placeAt(this.tool, tile);
    this.placementValidation = this.simulation.getPlacementValidation(this.tool, tile);
    this.emitSnapshot();
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.button === 2) {
      this.isRightDragging = false;
    }
  };

  private onPointerLeave = (): void => {
    this.isRightDragging = false;
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    this.renderer.camera.zoomAt(zoomFactor, localX, localY);
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.key.toLowerCase());
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };
}

export function getToolCost(tool: BuildTool): number {
  if (tool.kind === 'path') {
    return 8;
  }

  if (tool.kind === 'attraction') {
    return ATTRACTION_BY_ID[tool.definitionId]?.buildCost ?? 0;
  }

  if (tool.kind === 'scenery') {
    return SCENERY_BY_ID[tool.sceneryType]?.buildCost ?? 0;
  }

  return 0;
}

export function getToolName(tool: BuildTool): string {
  if (tool.kind === 'inspect') {
    return 'Inspect';
  }
  if (tool.kind === 'demolish') {
    return 'Demolish';
  }
  if (tool.kind === 'path') {
    return 'Path';
  }
  if (tool.kind === 'attraction') {
    return ATTRACTION_BY_ID[tool.definitionId]?.name ?? 'Attraction';
  }
  return SCENERY_BY_ID[tool.sceneryType]?.name ?? 'Scenery';
}

export function getToolFootprint(tool: BuildTool): { width: number; height: number } {
  return getPlacementFootprint(tool, {
    attractionById: ATTRACTION_BY_ID,
    sceneryById: SCENERY_BY_ID,
  });
}
