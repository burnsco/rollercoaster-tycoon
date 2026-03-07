import {
  CAMERA_MOVE_SPEED,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  MAP_HEIGHT,
  MAP_WIDTH,
  TILE_SIZE,
} from '../data/constants';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export class Camera {
  readonly state: CameraState = {
    x: MAP_WIDTH * TILE_SIZE * 0.1,
    y: MAP_HEIGHT * TILE_SIZE * 0.35,
    zoom: 1,
  };

  pan(deltaX: number, deltaY: number): void {
    this.state.x -= deltaX / this.state.zoom;
    this.state.y -= deltaY / this.state.zoom;
  }

  updateFromKeys(keys: Set<string>, dt: number): void {
    let dx = 0;
    let dy = 0;

    if (keys.has('arrowleft') || keys.has('a')) {
      dx -= 1;
    }
    if (keys.has('arrowright') || keys.has('d')) {
      dx += 1;
    }
    if (keys.has('arrowup') || keys.has('w')) {
      dy -= 1;
    }
    if (keys.has('arrowdown') || keys.has('s')) {
      dy += 1;
    }

    if (dx !== 0 || dy !== 0) {
      const speed = CAMERA_MOVE_SPEED * dt;
      this.state.x += dx * speed;
      this.state.y += dy * speed;
    }
  }

  zoomAt(amount: number, screenX: number, screenY: number): void {
    const previousZoom = this.state.zoom;
    const nextZoom = clamp(this.state.zoom * amount, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX);

    if (nextZoom === previousZoom) {
      return;
    }

    const worldX = this.state.x + screenX / previousZoom;
    const worldY = this.state.y + screenY / previousZoom;

    this.state.zoom = nextZoom;
    this.state.x = worldX - screenX / nextZoom;
    this.state.y = worldY - screenY / nextZoom;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
