type CanvasTask = {
  resolve: (canvas: OffscreenCanvas) => void;
  reject: (err: Error) => void;
};

export class OffscreenCanvasPool {
  private pool: OffscreenCanvas[] = [];
  private inUse = new Set<OffscreenCanvas>();
  private waitQueue: CanvasTask[] = [];

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly maxSize: number = 4
  ) {}

  /**
   * Acquire an OffscreenCanvas from the pool. If none are available and the pool
   * has not reached maxSize, a new one is created. Otherwise, waits until one is released.
   */
  acquire(): Promise<OffscreenCanvas> {
    // Try to find an unused canvas
    const canvas = this.pool.find((c) => !this.inUse.has(c));
    if (canvas) {
      this.inUse.add(canvas);
      return Promise.resolve(canvas);
    }

    // Create a new one if under max size
    if (this.pool.length < this.maxSize) {
      const newCanvas = new OffscreenCanvas(this.width, this.height);
      this.pool.push(newCanvas);
      this.inUse.add(newCanvas);
      return Promise.resolve(newCanvas);
    }

    // Otherwise, wait for one to be released
    return new Promise((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
    });
  }

  /**
   * Release a canvas back to the pool.
   * If any tasks are waiting, the canvas is passed directly to the next one.
   */
  release(canvas: OffscreenCanvas): void {
    if (!this.inUse.has(canvas)) {
      throw new Error('Canvas was not acquired from this pool');
    }

    this.inUse.delete(canvas);

    if (this.waitQueue.length > 0) {
      const { resolve } = this.waitQueue.shift()!;
      this.inUse.add(canvas); // immediately mark as in use again
      resolve(canvas);
    }
  }

  /**
   * Destroy the pool and all canvases.
   * (Note: OffscreenCanvas has no explicit `destroy`, so this just clears memory)
   */
  dispose(): void {
    this.pool = [];
    this.inUse.clear();
    this.waitQueue.forEach((task) =>
      task.reject(new Error('Canvas pool disposed before task could run'))
    );
    this.waitQueue = [];
  }
}
