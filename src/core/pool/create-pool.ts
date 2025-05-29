import { isServer } from '@/core/env.ts';

export interface Pool<T> {
  acquire(): Promise<T>;
  release(resource: T): Promise<void>;
  clear(): Promise<void>;
}

export interface Waiter<T> {
  resolve: (res: T) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export function createPool<T>(
  resources: T[],
  timeoutMs = 5_000,
  dispose?: (resource: T) => void | Promise<void>
): Pool<T> {
  const available: T[] = [...resources];
  const waiting: Waiter<T>[] = [];
  const allocated = new Set<T>();

  let disposed = false;

  async function safeDispose(resource: T): Promise<void> {
    if (!dispose) {
      return;
    }
    try {
      await dispose(resource);
    } catch (err) {
      console.error(
        'Error during resource disposal:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  function acquire(): Promise<T> {
    if (disposed) {
      return Promise.reject(new Error('Pool is disposed'));
    }

    if (available.length > 0) {
      const resource = available.pop();
      if (resource !== undefined) {
        allocated.add(resource);
        return Promise.resolve(resource);
      }
      return Promise.reject(
        new Error('Internal pool error: Expected resource not found in available list')
      );
    }

    return new Promise<T>((resolve, reject) => {
      let waiterReference: Waiter<T> | null = null;

      const timer = setTimeout(() => {
        const index = waiterReference ? waiting.indexOf(waiterReference) : -1;
        if (index !== -1) {
          waiting.splice(index, 1);
          reject(new Error('Pool acquire timeout'));
        }
      }, timeoutMs);

      waiterReference = { resolve, reject, timer };
      waiting.push(waiterReference);
    });
  }

  async function release(resource: T): Promise<void> {
    if (!allocated.has(resource)) {
      if (disposed) {
        await safeDispose(resource);
        return;
      }

      throw new Error('Pool release of unknown or already released resource');
    }

    allocated.delete(resource);

    if (disposed) {
      await safeDispose(resource);
      return;
    }

    if (waiting.length > 0) {
      const waiter = waiting.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        allocated.add(resource);
        waiter.resolve(resource);
      } else {
        available.push(resource);
      }
    }
  }

  async function clear(): Promise<void> {
    if (disposed) {
      return;
    }

    disposed = true;

    const currentWaiting = [...waiting];

    waiting.length = 0;

    for (const waiter of currentWaiting) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('Pool cleared'));
    }

    const disposalPromises: Promise<void>[] = [];

    for (const resource of available) {
      disposalPromises.push(safeDispose(resource));
    }

    available.length = 0;

    for (const resource of Array.from(allocated)) {
      disposalPromises.push(safeDispose(resource));
    }

    allocated.clear();

    await Promise.all(disposalPromises);
  }

  return { acquire, release, clear };
}

export function autoDisposeOnExit<T>(pool: ReturnType<typeof createPool<T>>) {
  if (typeof process !== 'undefined' && process.on) {
    const dispose = () => pool.clear();
    process.on('exit', dispose);
    process.on('SIGINT', () => {
      dispose();
      process.exit();
    });
    process.on('SIGTERM', () => {
      dispose();
      process.exit();
    });
  }
}

export function autoDisposeOnUnload<T>(pool: ReturnType<typeof createPool<T>>) {
  if (typeof window !== 'undefined') {
    window.addEventListener('unload', () => {
      pool.clear();
    });
  }
}

export function autoDispose<T>(pool: ReturnType<typeof createPool<T>>): void {
  if (isServer()) {
    autoDisposeOnExit(pool);
  } else {
    autoDisposeOnUnload(pool);
  }
}
