import { autoDispose, createPool } from '@/core/pool/create-pool.ts';
import type { Pool } from '@/core/pool/types.ts';
import { isServer } from '@/core/env.ts';
import { createWithResource } from '@/core/pool/create-with-resource.ts';

const WORKER_SCRIPT_URL = new URL('./worker-script.worker.ts', import.meta.url);

function createDecodeWorker(): Worker {
  return new Worker(WORKER_SCRIPT_URL, { type: 'module' });
}

export function createWorkerPool(maxWorkers = 4, timeoutMs = 5000): Pool<Worker> {
  if (isServer()) {
    throw new Error('Worker pool cannot be created in server environment');
  }

  const workers = Array.from({ length: maxWorkers }, createDecodeWorker);

  const pool = createPool(workers, timeoutMs, (worker) => worker.terminate());

  autoDispose(pool);

  return pool;
}

const defaultWorkerPool = createWorkerPool();

export const withWorker = createWithResource(defaultWorkerPool);

export function getWorkerPool(): Pool<Worker> {
  return defaultWorkerPool;
}
