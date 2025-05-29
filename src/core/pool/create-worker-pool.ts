import { autoDispose } from '@/core/pool/index.ts';
import type { Pool } from '@/core/pool/types.ts';

export type WorkerPool = Pool<Worker>;

export function createWorkerPool(
  scriptUrl: string,
  count: number,
  timeoutMs = 5000
): WorkerPool {
  const workers: Worker[] = [];
  const available: Worker[] = [];
  const waiting: {
    resolve: (worker: Worker) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }[] = [];
  const allocated = new Set<Worker>();
  let disposed = false;

  for (let i = 0; i < count; i++) {
    const worker = new Worker(scriptUrl, { type: 'module' });
    workers.push(worker);
    available.push(worker);
  }

  async function acquire(): Promise<Worker> {
    if (disposed) throw new Error('WorkerPool is disposed');

    if (available.length > 0) {
      const worker = available.pop()!;
      allocated.add(worker);
      return worker;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('WorkerPool acquire timeout'));
      }, timeoutMs);
      waiting.push({ resolve, reject, timer });
    });
  }

  async function release(worker: Worker): Promise<void> {
    if (!allocated.has(worker)) {
      if (disposed) return worker.terminate();
      throw new Error('Attempted to release unknown worker');
    }

    allocated.delete(worker);

    if (disposed) {
      worker.terminate();
      return;
    }

    if (waiting.length > 0) {
      const waiter = waiting.shift()!;
      clearTimeout(waiter.timer);
      allocated.add(worker);
      waiter.resolve(worker);
    } else {
      available.push(worker);
    }
  }

  async function clear(): Promise<void> {
    disposed = true;

    waiting.forEach((w) => {
      clearTimeout(w.timer);
      w.reject(new Error('WorkerPool cleared'));
    });
    waiting.length = 0;

    const toDispose = [...available, ...allocated];
    available.length = 0;
    allocated.clear();

    await Promise.all(toDispose.map((worker) => worker.terminate()));
  }

  const pool = { acquire, release, clear };
  autoDispose(pool);
  return pool;
}
