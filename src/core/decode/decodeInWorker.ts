import { withWorker } from '@/core/pool/worker-pool.ts';
import type { PixelData } from '@/types';

export async function decodeInWorker(data: Uint8Array): Promise<PixelData> {
  return withWorker((worker) => {
    return new Promise((resolve, reject) => {
      const onMessage = (e: MessageEvent) => {
        cleanup();
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          const { width, height, buffer } = e.data;
          resolve({
            width,
            height,
            data: new Uint8ClampedArray(buffer)
          });
        }
      };

      const onError = (e: ErrorEvent) => {
        cleanup();
        reject(e.error);
      };

      const cleanup = () => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
      };

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage({ data }, [data.buffer]);
    });
  });
}
