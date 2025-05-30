import type {
  WorkerErrorResponse,
  WorkerResponse,
  WorkerSuccessResponse,
  WorkerTask
} from './worker-types';
import { autoDispose, createPool } from './create-pool';
import { PixeliftWorkerError } from '../error';
import { getHardwareConcurrency } from '@/core/pool/concurrency.ts';

const WORKER_SCRIPT_URL = new URL('./worker-script.worker.ts', import.meta.url);

const DEFAULT_TIMEOUT = 15_000;

export interface WorkerHandle {
  postTask<T = unknown>(task: WorkerTask, transferables?: Transferable[]): Promise<T>;

  terminate(): void;
}

export class ManagedWorker implements WorkerHandle {
  private worker: Worker;
  private pending = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
    }
  >();

  constructor() {
    this.worker = new Worker(WORKER_SCRIPT_URL, { type: 'module' });
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);
  }

  postTask<T = unknown>(task: WorkerTask, transferables: Transferable[] = []): Promise<T> {
    const message = task;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(message.id, { resolve, reject });
      try {
        this.worker.postMessage(message, transferables);
      } catch (err) {
        this.pending.delete(message.id);
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
    if (!data || typeof data !== 'object' || !('id' in data) || !('type' in data)) {
      return;
    }

    const { id, type } = data;
    const taskCallback = this.pending.get(id);
    if (!taskCallback) {
      return;
    }

    if (type === 'success') {
      taskCallback.resolve(data as WorkerSuccessResponse);
    } else if (type === 'error') {
      const errorResponse = data as WorkerErrorResponse;
      const errData = errorResponse.error || {};
      taskCallback.reject(
        new PixeliftWorkerError(errData.message || 'Worker error', { cause: errData })
      );
    } else {
      taskCallback.reject(
        new PixeliftWorkerError(`Unknown worker message type: ${type}`, {
          cause: { receivedMessage: data }
        })
      );
    }

    this.pending.delete(id);
  }

  private handleError(event: ErrorEvent) {
    event.preventDefault();
    const errorMessage = event.message || 'Worker encountered an unhandled error';
    const errorCause = event.error ?? new Error(errorMessage);
    const error = new PixeliftWorkerError(errorMessage, { cause: errorCause });
    console.error('Worker error:', error);
    for (const { reject } of this.pending.values()) {
      reject(error);
    }
    this.pending.clear();
  }
}

export const workerPool = {
  pool: createPool<WorkerHandle>(
    Array.from(
      {
        length: 20
      },
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
      return await worker.postTask<T>(task, transferables);
    } finally {
      await this.pool.release(worker);
    }
  },

  async reconfigure(concurrency: number = 4) {
    await this.pool.clear();
    this.pool = createPool<WorkerHandle>(
      Array.from({ length: concurrency }, () => new ManagedWorker()),
      DEFAULT_TIMEOUT,
      (worker) => worker.terminate()
    );
    console.info(`Worker pool reconfigured to ${concurrency} workers`);
  },

  async adjustPool() {
    // const cores = getHardwareConcurrency();
    // await this.reconfigure(cores - 1);
  }
};

autoDispose(workerPool.pool);
