import { TILE_SIZE } from '../data/constants';
import type {
  AttractionDefinition,
  GameState,
  RenderOverlay,
  UISnapshot,
} from '../entities/types';
import { Camera } from './Camera';

interface RendererDeps {
  attractionById: Record<string, AttractionDefinition>;
}

export class CanvasRenderer {
  readonly camera = new Camera();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly deps: RendererDeps;

  constructor(canvas: HTMLCanvasElement, deps: RendererDeps) {
    this.canvas = canvas;
    this.deps = deps;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create 2D context.');
    }
    this.ctx = context;
  }

  screenToTile(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    const worldX = this.camera.state.x + localX / this.camera.state.zoom;
    const worldY = this.camera.state.y + localY / this.camera.state.zoom;

    return {
      x: Math.floor(worldX / TILE_SIZE),
      y: Math.floor(worldY / TILE_SIZE),
    };
  }

  render(state: GameState, overlay: RenderOverlay): void {
    const { cssWidth, cssHeight } = this.syncCanvasSize();
    const dpr = window.devicePixelRatio || 1;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, cssWidth, cssHeight);
    this.ctx.fillStyle = '#88c88b';
    this.ctx.fillRect(0, 0, cssWidth, cssHeight);

    this.ctx.save();
    this.ctx.scale(this.camera.state.zoom, this.camera.state.zoom);
    this.ctx.translate(-this.camera.state.x, -this.camera.state.y);

    this.drawMap(state);
    this.drawAttractions(state);
    this.drawScenery(state);
    this.drawGuests(state);
    this.drawStaff(state);
    this.drawOverlay(state, overlay);

    this.ctx.restore();
  }

  private syncCanvasSize(): { cssWidth: number; cssHeight: number } {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = this.canvas.clientWidth;
    const cssHeight = this.canvas.clientHeight;

    const width = Math.floor(cssWidth * dpr);
    const height = Math.floor(cssHeight * dpr);

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    return { cssWidth, cssHeight };
  }

  private drawMap(state: GameState): void {
    const startX = Math.max(0, Math.floor(this.camera.state.x / TILE_SIZE) - 1);
    const startY = Math.max(0, Math.floor(this.camera.state.y / TILE_SIZE) - 1);

    const viewportWidth = this.canvas.clientWidth / this.camera.state.zoom;
    const viewportHeight = this.canvas.clientHeight / this.camera.state.zoom;

    const endX = Math.min(state.map.width - 1, Math.ceil((this.camera.state.x + viewportWidth) / TILE_SIZE) + 1);
    const endY = Math.min(state.map.height - 1, Math.ceil((this.camera.state.y + viewportHeight) / TILE_SIZE) + 1);

    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = state.map.tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile.terrain === 'water') {
          this.ctx.fillStyle = '#5fa7d1';
        } else if (tile.hasPath) {
          this.ctx.fillStyle = '#d4c5a5';
        } else {
          this.ctx.fillStyle = ((x + y) & 1) === 0 ? '#79bc73' : '#74b16d';
        }

        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        if (tile.hasPath && tile.litter > 20) {
          this.ctx.fillStyle = `rgba(104, 70, 45, ${Math.min(0.65, tile.litter / 160)})`;
          this.ctx.fillRect(px + 5, py + 5, 4, 4);
          this.ctx.fillRect(px + 17, py + 13, 3, 3);
        }

        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }

    const entrance = state.map.entrance;
    this.ctx.strokeStyle = '#ffe16d';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(
      entrance.x * TILE_SIZE + 3,
      entrance.y * TILE_SIZE + 3,
      TILE_SIZE - 6,
      TILE_SIZE - 6,
    );
    this.ctx.lineWidth = 1;
  }

  private drawAttractions(state: GameState): void {
    for (const attraction of Object.values(state.attractions)) {
      const definition = this.deps.attractionById[attraction.definitionId];
      if (!definition) {
        continue;
      }

      const x = attraction.origin.x * TILE_SIZE;
      const y = attraction.origin.y * TILE_SIZE;
      const width = attraction.footprint.width * TILE_SIZE;
      const height = attraction.footprint.height * TILE_SIZE;

      this.ctx.fillStyle = attraction.broken
        ? '#6d6d6d'
        : attraction.open
          ? definition.baseColor
          : '#8f94a0';
      this.ctx.fillRect(x + 1, y + 1, width - 2, height - 2);

      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

      this.ctx.fillStyle = '#1f2a36';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.fillText(definition.name, x + 4, y + 13);

      const queueRatio = Math.min(1, attraction.queue.length / Math.max(1, attraction.maxQueue));
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.fillRect(x + 4, y + height - 8, width - 8, 4);
      this.ctx.fillStyle = queueRatio > 0.75 ? '#ff6d6d' : '#4ea5ff';
      this.ctx.fillRect(x + 4, y + height - 8, (width - 8) * queueRatio, 4);

      const accessX = attraction.accessTile.x * TILE_SIZE + TILE_SIZE * 0.5;
      const accessY = attraction.accessTile.y * TILE_SIZE + TILE_SIZE * 0.5;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(accessX, accessY, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawScenery(state: GameState): void {
    for (const scenery of Object.values(state.scenery)) {
      const type = scenery.type;
      const x = scenery.origin.x * TILE_SIZE;
      const y = scenery.origin.y * TILE_SIZE;

      if (type === 'tree') {
        this.ctx.fillStyle = '#3b8c4a';
        this.ctx.beginPath();
        this.ctx.arc(x + 16, y + 14, 10, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#7f5f3f';
        this.ctx.fillRect(x + 14, y + 14, 4, 11);
      } else if (type === 'bench') {
        this.ctx.fillStyle = '#8a6649';
        this.ctx.fillRect(x + 6, y + 12, 20, 7);
      } else if (type === 'bin') {
        this.ctx.fillStyle = '#4a6685';
        this.ctx.fillRect(x + 11, y + 10, 10, 13);
      } else {
        this.ctx.fillStyle = '#c861a8';
        this.ctx.beginPath();
        this.ctx.arc(x + 12, y + 14, 6, 0, Math.PI * 2);
        this.ctx.arc(x + 20, y + 17, 6, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private drawGuests(state: GameState): void {
    for (const guest of Object.values(state.guests)) {
      const x = guest.tile.x * TILE_SIZE + TILE_SIZE * 0.5;
      const y = guest.tile.y * TILE_SIZE + TILE_SIZE * 0.5;

      this.ctx.fillStyle = colorFromNeed(guest.happiness, guest.nausea);
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawStaff(state: GameState): void {
    for (const staff of Object.values(state.staff)) {
      const x = staff.tile.x * TILE_SIZE + TILE_SIZE * 0.5 - 4;
      const y = staff.tile.y * TILE_SIZE + TILE_SIZE * 0.5 - 4;
      this.ctx.fillStyle = staff.type === 'mechanic' ? '#3d5ca6' : '#3fa977';
      this.ctx.fillRect(x, y, 8, 8);
      this.ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      this.ctx.strokeRect(x, y, 8, 8);
    }
  }

  private drawOverlay(state: GameState, overlay: RenderOverlay): void {
    const hovered = overlay.hoveredTile;
    if (hovered) {
      const width = overlay.previewSize.width;
      const height = overlay.previewSize.height;
      const valid = overlay.placementValidation?.valid ?? true;

      this.ctx.fillStyle =
        overlay.tool.kind === 'inspect'
          ? 'rgba(60, 90, 255, 0.15)'
          : valid
            ? 'rgba(60, 220, 110, 0.22)'
            : 'rgba(255, 80, 80, 0.25)';
      this.ctx.fillRect(
        hovered.x * TILE_SIZE,
        hovered.y * TILE_SIZE,
        width * TILE_SIZE,
        height * TILE_SIZE,
      );

      this.ctx.strokeStyle = valid ? '#29a552' : '#ce4040';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(
        hovered.x * TILE_SIZE + 1,
        hovered.y * TILE_SIZE + 1,
        width * TILE_SIZE - 2,
        height * TILE_SIZE - 2,
      );
      this.ctx.lineWidth = 1;
    }

    if (overlay.selection.type === 'attraction' && overlay.selection.id) {
      const selected = state.attractions[overlay.selection.id];
      if (selected) {
        this.ctx.strokeStyle = '#ffe15c';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(
          selected.origin.x * TILE_SIZE + 2,
          selected.origin.y * TILE_SIZE + 2,
          selected.footprint.width * TILE_SIZE - 4,
          selected.footprint.height * TILE_SIZE - 4,
        );
      }
    }

    if (overlay.selection.type === 'guest' && overlay.selection.id) {
      const guest = state.guests[overlay.selection.id];
      if (guest) {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(
          guest.tile.x * TILE_SIZE + TILE_SIZE * 0.5,
          guest.tile.y * TILE_SIZE + TILE_SIZE * 0.5,
          7,
          0,
          Math.PI * 2,
        );
        this.ctx.stroke();
      }
    }

    if (overlay.selection.type === 'staff' && overlay.selection.id) {
      const staff = state.staff[overlay.selection.id];
      if (staff) {
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(
          staff.tile.x * TILE_SIZE + 8,
          staff.tile.y * TILE_SIZE + 8,
          TILE_SIZE - 16,
          TILE_SIZE - 16,
        );
      }
    }
  }
}

function colorFromNeed(happiness: number, nausea: number): string {
  if (nausea > 70) {
    return '#8ac56c';
  }
  if (happiness > 75) {
    return '#ffffff';
  }
  if (happiness > 45) {
    return '#f4f1d2';
  }
  return '#f7a99d';
}

export function formatTime(snapshot: UISnapshot): string {
  const percent = snapshot.dayProgress;
  const hours = 8 + Math.floor(percent * 12);
  const minutes = Math.floor((percent * 12 * 60) % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
