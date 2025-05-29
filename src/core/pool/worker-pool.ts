import { autoDispose, createPool, type Pool } from '@/core/pool/create-pool.ts';
import { createWithResource } from '@/core/pool/create-with-resource';
import { getHardwareConcurrency } from '@/core/pool/concurrency';
import type {
  TypedWorker,
  WorkerRequest,
  WorkerResponse
} from '@/core/pool/worker-types.ts';

const WORKER_SCRIPT_URL = new URL('./worker-script.worker', import.meta.url);

export function createWorkerPool(
  maxWorkers: number | null = null,
  timeoutMs = 5_000
): Pool<TypedWorker> {
  const cores = getHardwareConcurrency();
  maxWorkers = maxWorkers ?? Math.max(1, Math.floor(cores / 2));
  const workers = Array.from({ length: maxWorkers }, createDecodeWorker);
  const pool = createPool(workers, timeoutMs, (worker) => worker.terminate());
  autoDispose(pool);
  return pool;
}

export function createDecodeWorker(): TypedWorker {
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
    },
    set onerror(handler: (event: ErrorEvent) => void) {
      worker.onerror = handler;
    }
  };
}

let internalWorkerPool = createWorkerPool();

export async function configureWorkerPool(maxWorkers: number) {
  await internalWorkerPool.clear();
  internalWorkerPool = createWorkerPool(maxWorkers);
}

export const withWorker = createWithResource(internalWorkerPool);
