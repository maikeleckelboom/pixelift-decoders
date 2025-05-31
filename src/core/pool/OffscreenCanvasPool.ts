type CanvasTask = {
  resolve: (canvas: OffscreenCanvas) => void;
  reject: (err: Error) => void;
  signal?: AbortSignal | undefined;
};

export interface Pool {
  acquire(signal?: AbortSignal): Promise<OffscreenCanvas>;
  release(canvas: OffscreenCanvas): void;
  dispose(): void;
}

export class OffscreenCanvasPool implements Pool {
  private pool: OffscreenCanvas[] = [];
  private inUse = new Set<OffscreenCanvas>();
  private waitQueue: CanvasTask[] = [];

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly maxSize: number = 4
  ) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be a positive number.');
    }
    if (width <= 0 || height <= 0) {
      throw new Error('Canvas width and height must be positive numbers.');
    }
  }

  acquire(signal?: AbortSignal): Promise<OffscreenCanvas> {
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Operation aborted', 'AbortError'));
    }

    const canvas = this.pool.find((c) => !this.inUse.has(c));
    if (canvas) {
      this.inUse.add(canvas);
      return Promise.resolve(canvas);
    }

    if (this.pool.length < this.maxSize) {
      const newCanvas = new OffscreenCanvas(this.width, this.height);
      this.pool.push(newCanvas);
      this.inUse.add(newCanvas);
      return Promise.resolve(newCanvas);
    }

    return new Promise((resolve, reject) => {
      const task: CanvasTask = { resolve, reject, signal };
      this.waitQueue.push(task);

      signal?.addEventListener(
        'abort',
        () => {
          const index = this.waitQueue.indexOf(task);
          if (index !== -1) {
            this.waitQueue.splice(index, 1);
            reject(new DOMException('Operation aborted', 'AbortError'));
          }
        },
        { once: true }
      );
    });
  }

  release(canvas: OffscreenCanvas): void {
    if (!this.inUse.has(canvas)) {
      throw new Error('Canvas was not acquired from this pool');
    }

    this.inUse.delete(canvas);

    while (this.waitQueue.length > 0) {
      const task = this.waitQueue.shift()!;
      if (task.signal?.aborted) {
        task.reject(new DOMException('Operation aborted', 'AbortError'));
        continue;
      }

      this.inUse.add(canvas);
      task.resolve(canvas);
      return;
    }
  }

  dispose(): void {
    this.pool = [];
    this.inUse.clear();
    this.waitQueue.forEach((task) =>
      task.reject(new Error('Canvas pool disposed before task could run'))
    );
    this.waitQueue = [];
  }
}
