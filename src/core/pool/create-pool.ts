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
  timeoutMs = 15_000,
  dispose?: (resource: T) => void | Promise<void>
): Pool<T> {
  const available: T[] = [...resources];
  const waiting: Waiter<T>[] = [];
  const allocated = new Set<T>();

  let disposed = false;

  async function safeDispose(resource: T): Promise<void> {
    if (!dispose) return;
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
      const resource = available.pop()!;
      allocated.add(resource);
      return Promise.resolve(resource);
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = waiting.findIndex((w) => w.reject === reject);
        if (index !== -1) {
          waiting.splice(index, 1);
          reject(new Error('Pool acquire timeout'));
        }
      }, timeoutMs);

      waiting.push({ resolve, reject, timer });
    });
  }

  async function release(resource: T): Promise<void> {
    if (disposed) {
      await safeDispose(resource);
      return;
    }

    if (!allocated.has(resource)) {
      throw new Error('Pool release of unknown or already released resource');
    }

    allocated.delete(resource);

    // Re-check disposed state after synchronous operations
    if (disposed) {
      await safeDispose(resource);
      return;
    }

    if (waiting.length > 0) {
      const waiter = waiting.shift()!;
      clearTimeout(waiter.timer);
      allocated.add(resource);
      waiter.resolve(resource);
      return;
    }

    available.push(resource);
  }

  async function clear(): Promise<void> {
    if (disposed) return;
    disposed = true;

    // Clear waiters first
    const currentWaiters = [...waiting];
    waiting.length = 0;
    currentWaiters.forEach((waiter) => {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('Pool cleared'));
    });

    // Dispose available resources
    const disposePromises: Promise<void>[] = [];
    while (available.length > 0) {
      const resource = available.pop()!;
      disposePromises.push(safeDispose(resource));
    }

    // Dispose allocated resources
    const allocatedResources = [...allocated];
    allocated.clear();
    allocatedResources.forEach((resource) => {
      disposePromises.push(safeDispose(resource));
    });

    await Promise.all(disposePromises);
  }

  return { acquire, release, clear };
}

export function autoDisposeOnExit<T>(pool: Pool<T>) {
  if (typeof process !== 'undefined' && process.on) {
    const cleanup = async () => {
      await pool.clear();
    };

    const shutdown = async (signal: string) => {
      await cleanup();
      process.exit(signal === 'SIGINT' ? 130 : 143);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }
}

export function autoDisposeOnUnload<T>(pool: Pool<T>) {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', pool.clear);
  }
}

export function autoDispose<T>(pool: Pool<T>): void {
  if (isServer()) {
    autoDisposeOnExit(pool);
  } else {
    autoDisposeOnUnload(pool);
  }
}
