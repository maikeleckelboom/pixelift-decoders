import { autoDispose, createPool } from '@/core/pool/create-pool.ts';
import type { Pool } from '@/core/pool/types.ts';
import { isServer } from '@/core/env.ts';
import { createWithResource } from '@/core/pool/create-with-resource.ts';
import type { WorkerRequest, WorkerResponse } from '@/core/pool/worker-messages.ts';

const WORKER_SCRIPT_URL = new URL('./worker-script.worker.ts', import.meta.url);

export interface TypedWorker {
  worker: Worker;
  terminate(): void;
  postMessage(message: WorkerRequest, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
}

function createDecodeWorker(): TypedWorker {
  const worker = new Worker(WORKER_SCRIPT_URL, { type: 'module' });
  return {
    worker,
    terminate: () => worker.terminate(),
    postMessage: (message: WorkerRequest, transfer?: Transferable[]) => {
      if (transfer) {
        worker.postMessage(message, transfer);
      } else {
        worker.postMessage(message);
      }
    },
    get onmessage() {
      return worker.onmessage as (event: MessageEvent<WorkerResponse>) => void;
    },
    set onmessage(handler) {
      worker.onmessage = handler;
    }
  };
}

export function createWorkerPool(maxWorkers = 4, timeoutMs = 5000): Pool<TypedWorker> {
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
