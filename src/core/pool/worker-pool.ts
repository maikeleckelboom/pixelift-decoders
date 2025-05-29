import type { WorkerResponse, WorkerTask } from './worker-types';
import { autoDispose, createPool } from './create-pool';
import { getHardwareConcurrency } from './concurrency';
import { PixeliftWorkerError } from '../error';
import { getTransferList } from '@/core/decode/decodeWithCanvasWorker.ts';

const WORKER_SCRIPT_URL = new URL('./worker-script.worker', import.meta.url);
const DEFAULT_TIMEOUT = 5_000;

export interface WorkerHandle {
  postTask<T = unknown>(task: WorkerTask): Promise<T>;
  terminate(): void;
}

export class ManagedWorker implements WorkerHandle {
  private worker: Worker;
  private pending = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
    }
  >();
  private nextId = 1;

  constructor() {
    this.worker = new Worker(WORKER_SCRIPT_URL, { type: 'module' });
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);
  }

  postTask<T = unknown>(task: WorkerTask): Promise<T> {
    const id = this.nextId++;
    const message = { ...task, id };

    // DEBUG: Log what we're sending to the worker
    console.log('[DEBUG] Sending to worker:', message);

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      // Defensive: wrap postMessage in try/catch in case transfer list is invalid
      try {
        this.worker.postMessage(message, getTransferList(task.data));
      } catch (err) {
        console.error('[DEBUG] Error posting message to worker:', err);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  terminate() {
    this.worker.terminate();
    const error = new PixeliftWorkerError('Worker terminated');
    for (const { reject } of this.pending.values()) {
      reject(error);
    }
    this.pending.clear();
  }

  private handleMessage(event: MessageEvent<WorkerResponse>) {
    const data = event.data;

    // DEBUG: Log what we received from the worker
    console.log('[DEBUG] Received from worker:', data);
    console.log('[DEBUG] Data type:', typeof data);
    console.log('[DEBUG] Data keys:', data ? Object.keys(data) : 'no keys');

    if (!data || typeof data !== 'object') {
      console.warn('[DEBUG] Ignoring malformed message:', data);
      return; // ignore malformed message
    }

    const { id, type } = data;
    console.log('[DEBUG] Extracted - id:', id, 'type:', type);

    const task = this.pending.get(id);
    if (!task) {
      console.warn('[DEBUG] No pending type found for id:', id);
      return;
    }

    if (type === 'success') {
      console.log('[DEBUG] Success response, result:', data.result);
      task.resolve(data.result);
    } else if (type === 'error') {
      console.log('[DEBUG] Error response:', data.error);
      const errData = data.error || {};
      task.reject(
        new PixeliftWorkerError(errData.message || 'Worker error', { cause: errData })
      );
    } else {
      // Unknown message type
      console.error('[DEBUG] Unknown message type received:', {
        type,
        typeOf: typeof type,
        fullData: data,
        keys: Object.keys(data)
      });
      task.reject(
        new PixeliftWorkerError(`Unknown worker message type: ${type}`, {
          data
        })
      );
    }

    this.pending.delete(id);
  }

  private handleError(event: ErrorEvent) {
    console.error('[DEBUG] Worker error event:', event);

    // The ErrorEvent itself carries message and possibly error
    const errorMessage = event.message || 'Worker encountered an error';
    const errorDetail = event.error ?? event;

    const error = new PixeliftWorkerError(errorMessage, errorDetail);

    for (const { reject } of this.pending.values()) {
      reject(error);
    }
    this.pending.clear();
  }
}

export const workerPool = {
  pool: createPool<WorkerHandle>(
    Array.from(
      { length: Math.max(1, Math.floor(getHardwareConcurrency() / 2)) },
      () => new ManagedWorker()
    ),
    DEFAULT_TIMEOUT,
    (worker) => worker.terminate()
  ),

  async executeTask<T = unknown>(
    task: WorkerTask,
    transferables: Transferable[] = []
  ): Promise<T> {
    const worker = await this.pool.acquire();
    try {
      // Notice: we pass transferables to postTask *inside* ManagedWorker
      // so no need to forward here, unless you plan to override
      return await worker.postTask<T>(task);
    } finally {
      await this.pool.release(worker);
    }
  },

  async reconfigure(concurrency: number) {
    await this.pool.clear();
    this.pool = createPool<WorkerHandle>(
      Array.from({ length: concurrency }, () => new ManagedWorker()),
      DEFAULT_TIMEOUT,
      (worker) => worker.terminate()
    );
    autoDispose(this.pool);
  }
};

autoDispose(workerPool.pool);
