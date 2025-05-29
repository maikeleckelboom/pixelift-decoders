import type {
  TypedWorker,
  WorkerRequest,
  WorkerResponse,
  WorkerErrorResponse,
  WorkerSuccessResponse
} from '@/core/pool/worker-types.ts';
import type { PixelData, ResizeOptions } from '@/types';

let currentId = 0;
function nextId(): number {
  return ++currentId;
}

const pending = new Map<
  number,
  {
    resolve: (value: Uint8ClampedArray) => void;
    reject: (reason?: any) => void;
  }
>();

export function setupWorker(worker: TypedWorker) {
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const { id, task } = event.data;
    const handlers = pending.get(Number(id));
    if (!handlers) return;

    if (task === 'process') {
      const success = event.data as WorkerSuccessResponse;
      handlers.resolve(success.result);
    } else if (task === 'error') {
      const error = event.data as WorkerErrorResponse;
      handlers.reject(new Error(error.error));
    } else {
      handlers.reject(new Error('Unexpected worker response'));
    }
    pending.delete(Number(id));
  };

  worker.onerror = (event: ErrorEvent) => {
    for (const { reject } of pending.values()) {
      reject(event.error ?? new Error('Worker error'));
    }
    pending.clear();
  };
}

export async function decodeUsingCanvasWorker(
  worker: TypedWorker,
  data: Uint8Array,
  resize?: ResizeOptions
): Promise<Uint8ClampedArray> {
  const id = nextId();

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });

    const transfer = [data.buffer];
    const message: WorkerRequest = { id, task: 'process', data, resize };

    worker.postMessage(message, transfer);
  });
}

export async function decodeWithCanvasWorker(
  source: ImageBitmapSource,
  options?: {
    resize?: ResizeOptions;
  }
): Promise<PixelData> {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('OffscreenCanvas is not supported in this environment');
  }

  const worker = new Worker(new URL('./decode.worker.ts', import.meta.url), {
    type: 'module'
  });

  setupWorker(worker);

  try {
    const data = await decodeUsingCanvasWorker(worker, source, options?.resize);
    return {
      width: source.width,
      height: source.height,
      data
    };
  } finally {
    worker.terminate();
  }
}
