import type { ResizeOptions } from '@/types';
import type {
  TypedWorker,
  WorkerRequest,
  WorkerResponse
} from '@/core/pool/worker-types.ts';

let currentId = 0;

function nextId(): number {
  return ++currentId;
}

async function decodeWithWorker(
  worker: TypedWorker,
  data: Uint8Array,
  resize?: ResizeOptions
): Promise<Uint8ClampedArray> {
  const id = nextId();

  return new Promise((resolve, reject) => {
    worker.onmessage = (event) => {
      const response = event.data as WorkerResponse;

      if (response.id !== id) return;

      if (response.task === 'process') {
        resolve(response.result);
      } else if (response.task === 'error') {
        reject(new Error(response.error));
      } else {
        reject(new Error('Unexpected worker response'));
      }
    };

    worker.onerror = (err) => reject(err);

    const transfer = [data.buffer];
    const message: WorkerRequest = { id, task: 'process', data, resize };
    worker.postMessage(message, transfer);
  });
}
