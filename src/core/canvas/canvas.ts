import { createPool } from '@/core/concurrency/create-pool.ts';

const MAX_CONCURRENT_CANVASES: number = 5 as const;

const canvasPool =
  typeof OffscreenCanvas !== 'undefined'
    ? createPool(
        Array.from({ length: MAX_CONCURRENT_CANVASES }, () => new OffscreenCanvas(1, 1))
      )
    : null;

async function withCanvas<T>(fn: (canvas: OffscreenCanvas) => Promise<T>): Promise<T> {
  if (!canvasPool) throw new Error('Canvas pool not available');
  const canvas = await canvasPool.acquire();
  try {
    return await fn(canvas);
  } finally {
    await canvasPool.release(canvas);
  }
}

function createConcurrencyPool(limit: number = MAX_CONCURRENT_CANVASES) {
  let active = 0;
  const queue: (() => void)[] = [];

  async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      return new Promise<T>((resolve, reject) => {
        queue.push(() => {
          active++;
          task()
            .then(resolve)
            .catch(reject)
            .finally(() => {
              active--;
              const next = queue.shift();
              if (next) next();
            });
        });
      });
    }

    active++;
    try {
      return await task();
    } finally {
      active--;
      const next = queue.shift();
      if (next) next();
    }
  }

  return run;
}

export { withCanvas, createConcurrencyPool, canvasPool, MAX_CONCURRENT_CANVASES };
