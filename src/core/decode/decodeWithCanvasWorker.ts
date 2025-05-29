import type {
  TypedWorker,
  WorkerRequest,
  WorkerResponse,
  WorkerErrorResponse,
  WorkerSuccessResponse
} from '@/core/pool/worker-types.ts';
import type { PixelData, ResizeOptions } from '@/types';
import { toTransferList } from '@/core/utils/canvas.ts';

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
    // Reject all pending promises if worker errors
    for (const { reject } of pending.values()) {
      reject(event.error ?? new Error('Worker error'));
    }
    pending.clear();
  };
}

export async function decodeWithCanvasWorker(
  input: ImageBitmapSource | Blob,
  options?: { resize?: ResizeOptions }
): Promise<PixelData> {
  const worker: TypedWorker = {
    worker: new Worker(new URL('@/core/pool/worker-script.worker.ts', import.meta.url), {
      type: 'module'
    }),
    terminate() {
      this.worker.terminate();
    },
    postMessage(message: WorkerRequest, transfer?: Transferable[]) {
      this.worker.postMessage(message, transfer);
    },
    onmessage: null,
    onerror: null
  };

  setupWorker(worker);

  const id = nextId();
  const resize = options?.resize;

  const request: WorkerRequest = {
    id,
    task: 'process',
    data: input instanceof Blob ? new Uint8Array(await input.arrayBuffer()) : input,
    resize
  };

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage(request, toTransferList(request.data));
  });
}
