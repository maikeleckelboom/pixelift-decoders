export interface Pool {
  acquire(signal?: AbortSignal): Promise<OffscreenCanvas>;
  release(canvas: OffscreenCanvas): void;
  dispose(): void;
}

export const PoolErrors = {
  INVALID_MAX_SIZE: 'The `maxSize` must be a positive number.',
  INVALID_DIMENSIONS: 'Canvas width and height must be positive numbers.',
  RELEASE_UNACQUIRED: 'Cannot release a canvas that is not acquired.',
  POOL_DISPOSED: 'Canvas pool disposed before task could run.',
  OPERATION_ABORTED: new DOMException('Operation aborted', 'AbortError')
};

export type CanvasTask = {
  resolve: (canvas: OffscreenCanvas) => void;
  reject: (err: Error) => void;
  signal?: AbortSignal | undefined;
};

export class OffscreenCanvasPool implements Pool {
  private pool: OffscreenCanvas[] = [];
  private inUse = new Set<OffscreenCanvas>();
  private waitQueue: CanvasTask[] = [];

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly maxSize: number = 4
  ) {
    if (maxSize <= 0) throw new Error(PoolErrors.INVALID_MAX_SIZE);
    if (width <= 0 || height <= 0) throw new Error(PoolErrors.INVALID_DIMENSIONS);
  }

  acquire(signal?: AbortSignal): Promise<OffscreenCanvas> {
    if (signal?.aborted) {
      return Promise.reject(PoolErrors.OPERATION_ABORTED);
    }

    const available = this.pool.find((canvas) => !this.inUse.has(canvas));
    if (available) {
      this.inUse.add(available);
      return Promise.resolve(available);
    }

    if (this.pool.length < this.maxSize) {
      const canvas = new OffscreenCanvas(this.width, this.height);
      this.pool.push(canvas);
      this.inUse.add(canvas);
      return Promise.resolve(canvas);
    }

    return new Promise((resolve, reject) => {
      const task: CanvasTask = { resolve, reject, signal };

      const onAbort = () => {
        const idx = this.waitQueue.indexOf(task);
        if (idx !== -1) {
          this.waitQueue.splice(idx, 1);
          reject(PoolErrors.OPERATION_ABORTED);
        }
      };

      signal?.addEventListener('abort', onAbort, { once: true });

      this.waitQueue.push(task);

      const cleanup = () => signal?.removeEventListener('abort', onAbort);

      task.resolve = (canvas) => {
        cleanup();
        resolve(canvas);
      };

      task.reject = (error) => {
        cleanup();
        reject(error);
      };
    });
  }

  release(canvas: OffscreenCanvas): void {
    if (!this.inUse.has(canvas)) {
      throw new Error(PoolErrors.RELEASE_UNACQUIRED);
    }

    this.inUse.delete(canvas);

    while (this.waitQueue.length) {
      const task = this.waitQueue.shift()!;
      if (task.signal?.aborted) {
        task.reject(PoolErrors.OPERATION_ABORTED);
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

    this.waitQueue.forEach((task) => task.reject(new Error(PoolErrors.POOL_DISPOSED)));
    this.waitQueue = [];
  }
}
