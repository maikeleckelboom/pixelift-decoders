// import type { Pool } from '@/core/pool/create-pool.ts';
//
// // Overload 1: No settings
// export function createWithResource<TResource>(
//   pool: Pool<TResource>
// ): <R>(fn: (resource: TResource) => Promise<R> | R) => Promise<R>;
//
// // Overload 2: With settings
// export function createWithResource<TResource, S>(
//   pool: Pool<TResource>,
//   getSettings: (resource: TResource) => S
// ): <R>(fn: (resource: TResource, settings: S) => Promise<R> | R) => Promise<R>;
//
// // Implementation
// export function createWithResource<TResource, S = undefined>(
//   pool: Pool<TResource>,
//   getSettings?: (resource: TResource) => S
// ) {
//   return async function withResource<R>(
//     fn: (resource: TResource, settings?: S) => Promise<R> | R
//   ): Promise<R> {
//     const resource = await pool.acquire();
//     try {
//       if (getSettings) {
//         const options = getSettings(resource);
//         // The caller is type-checked by the overload, but the implementation still needs an assertion
//         // because `fn` here is typed to potentially take optional settings.
//         return await (fn as (resource: TResource, settings: S) => Promise<R> | R)(
//           resource,
//           options
//         );
//       } else {
//         // Same here, casting fn to its non-settings form.
//         return await (fn as (resource: TResource) => Promise<R> | R)(resource);
//       }
//     } finally {
//       await pool.release(resource);
//     }
//   };
// }
