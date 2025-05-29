/**
 * Generic concurrency limiter for async tasks.
 * Use this to limit simultaneous running tasks.
 */
export function createConcurrencyPool(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      return new Promise<T>((resolve, reject) => {
        queue.push(() => {
          active++;
          task()
            .then(resolve)
            .catch(reject)
            .finally(() => {
              active--;
              const next = queue.shift();
              if (next) next();
            });
        });
      });
    }

    active++;
    try {
      return await task();
    } finally {
      active--;
      const next = queue.shift();
      if (next) next();
    }
  }

  return run;
}
