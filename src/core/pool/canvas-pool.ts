import { autoDispose, createPool } from '@/core/pool/create-pool.ts';
import type { Pool } from '@/core/pool/types';
import { createWithResource } from '@/core/pool/create-with-resource';
import { getHardwareConcurrency } from '@/core/pool/concurrency';

export function createCanvasPool(maxCanvases: number | null = null): Pool<OffscreenCanvas> {
  const cores = getHardwareConcurrency(4);
  maxCanvases ??= Math.max(1, Math.floor(cores / 2));
  const canvases = Array.from({ length: maxCanvases }, () => new OffscreenCanvas(1, 1));
  const pool = createPool(canvases);
  autoDispose(pool);
  return pool;
}

export const defaultCanvasPool = createCanvasPool();

export const withCanvas = createWithResource(defaultCanvasPool);
