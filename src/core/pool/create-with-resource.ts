import type { Pool } from '@/core/pool/create-pool.ts';

export function createWithResourceV1<T>(pool: Pool<T>) {
  return async function withResource<R>(fn: (resource: T) => Promise<R> | R): Promise<R> {
    const resource = await pool.acquire();
    try {
      return await fn(resource);
    } finally {
      await pool.release(resource);
    }
  };
}

export function createWithResource<TResource, S = undefined>(
  pool: Pool<TResource>,
  getSettings?: (resource: TResource) => S
) {
  return async function withResource<R>(
    fn: S extends undefined
      ? (resource: TResource) => Promise<R> | R
      : (resource: TResource, options: S) => Promise<R> | R
  ): Promise<R> {
    const resource = await pool.acquire();
    try {
      if (getSettings) {
        const options = getSettings(resource);
        return await (fn as (resource: TResource, settings: S) => Promise<R>)(
          resource,
          options
        );
      } else {
        return await (fn as (resource: TResource) => Promise<R>)(resource);
      }
    } finally {
      await pool.release(resource);
    }
  };
}
