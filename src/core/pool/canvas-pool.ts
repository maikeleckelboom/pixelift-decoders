import { autoDispose, createPool, type Pool } from '@/core/pool/create-pool.ts';
import { createWithResource } from '@/core/pool/create-with-resource';
import { getHardwareConcurrency } from '@/core/pool/concurrency';
import {
  CANVAS_IMAGE_SMOOTHING_SETTINGS,
  CANVAS_RENDERING_CONTEXT_2D_SETTINGS
} from '@/decoders/canvas/defaults.ts';

export function createCanvasPool(maxCanvases: number | null = null): Pool<OffscreenCanvas> {
  const cores = getHardwareConcurrency();
  maxCanvases ??= Math.max(1, Math.floor(cores / 2));
  const canvases = Array.from({ length: maxCanvases }, () => new OffscreenCanvas(1, 1));
  const pool = createPool(canvases);
  autoDispose(pool);
  return pool;
}

let internalCanvasPool = createCanvasPool();

export async function configureCanvasPool(maxWorkers: number) {
  await internalCanvasPool.clear();
  internalCanvasPool = createCanvasPool(maxWorkers);
}

/**
 * withCanvas passes canvas and smoothing options to the callback.
 */
export const withCanvas = createWithResource(internalCanvasPool, () => {
  return {
    ...CANVAS_RENDERING_CONTEXT_2D_SETTINGS,
    ...CANVAS_IMAGE_SMOOTHING_SETTINGS
  };
});
