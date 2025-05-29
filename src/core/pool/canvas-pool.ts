import { autoDispose, createPool } from '@/core/pool/create-pool.ts';
import type { Pool } from '@/core/pool/types.ts';
import { createWithResource } from '@/core/pool/create-with-resource.ts';

export function createCanvasPool(maxConcurrentCanvases = 5): Pool<OffscreenCanvas> {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('OffscreenCanvas is not supported in this environment');
  }

  const canvases = Array.from(
    { length: maxConcurrentCanvases },
    () => new OffscreenCanvas(1, 1)
  );

  const pool = createPool(canvases);

  autoDispose(pool);

  return pool;
}

export const defaultCanvasPool = createCanvasPool();

export const withCanvas = createWithResource(defaultCanvasPool);

export function getCanvasPool(): Pool<OffscreenCanvas> {
  return defaultCanvasPool;
}
