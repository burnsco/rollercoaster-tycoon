const FIXED_STEP_SECONDS = 1 / 30;
const MAX_FRAME_SECONDS = 0.25;

export class GameLoop {
  private frameHandle: number | null = null;
  private lastTimestamp = 0;
  private accumulator = 0;
  private readonly update: (dt: number) => void;
  private readonly render: (alpha: number) => void;

  constructor(update: (dt: number) => void, render: (alpha: number) => void) {
    this.update = update;
    this.render = render;
  }

  start(): void {
    if (this.frameHandle !== null) {
      return;
    }

    this.lastTimestamp = performance.now();
    this.frameHandle = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
  }

  private tick = (timestamp: number): void => {
    const deltaSeconds = Math.min(MAX_FRAME_SECONDS, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;
    this.accumulator += deltaSeconds;

    while (this.accumulator >= FIXED_STEP_SECONDS) {
      this.update(FIXED_STEP_SECONDS);
      this.accumulator -= FIXED_STEP_SECONDS;
    }

    this.render(this.accumulator / FIXED_STEP_SECONDS);
    this.frameHandle = requestAnimationFrame(this.tick);
  };
}
