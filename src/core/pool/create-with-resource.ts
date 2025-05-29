import type { Pool } from '@/core/pool/types.ts';

export function createWithResource<T>(pool: Pool<T>) {
  return async function withResource<R>(fn: (resource: T) => Promise<R> | R): Promise<R> {
    const resource = await pool.acquire();
    try {
      return await fn(resource);
    } finally {
      await pool.release(resource);
    }
  };
}
