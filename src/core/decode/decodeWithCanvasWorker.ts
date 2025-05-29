import type { WorkerTask, WorkerSuccessResponse } from '@/core/pool/worker-types';
import type { PixelData, ResizeOptions, BrowserInput } from '@/types';
import { workerPool } from '@/core/pool/worker-pool';
import { PixeliftWorkerError, PixeliftInputError, PixeliftDecodeError } from '@/core/error';

const DECODE_TASK_NAME = 'decode' as const;

export async function decodeWithCanvasWorker(
  input: BrowserInput,
  options?: { resize?: ResizeOptions }
): Promise<PixelData> {
  try {
    const { data, transferables } = await prepareWorkerPayload(input);

    const task: WorkerTask = {
      id: Array.from(crypto.randomUUID()).reduce(
        (hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0,
        0
      ),
      type: DECODE_TASK_NAME,
      data,
      resize: options?.resize
    };

    const result = await workerPool.executeTask<WorkerSuccessResponse>(task, transferables);

    validateWorkerResponse(result);

    return {
      data: result.result, // result.pixels -> in your worker code you used 'result'
      width: result.width,
      height: result.height
    };
  } catch (error) {
    if (error instanceof PixeliftWorkerError) {
      throw new PixeliftDecodeError('Worker decoding failed', error.message, {
        cause: error
      });
    }
    throw error;
  }
}

async function prepareWorkerPayload(
  input: BrowserInput
): Promise<{ data: any; transferables: Transferable[] }> {
  if (input instanceof Uint8Array) {
    return {
      data: { type: 'buffer', buffer: input },
      transferables: [input.buffer]
    };
  }

  if (input instanceof Blob) {
    const buffer = await input.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    return {
      data: { type: 'buffer', buffer: uint8 },
      transferables: [buffer]
    };
  }

  if (input instanceof ImageBitmap) {
    return {
      data: { type: 'bitmap', bitmap: input },
      transferables: [input]
    };
  }

  if (typeof input === 'string') {
    return {
      data: { type: 'url', url: input },
      transferables: []
    };
  }

  if (input instanceof HTMLImageElement && input.complete && input.naturalWidth > 0) {
    const bitmap = await createImageBitmap(input);
    return {
      data: { type: 'bitmap', bitmap },
      transferables: [bitmap]
    };
  }

  throw new PixeliftInputError(
    'Unsupported input type for worker',
    input?.constructor?.name || typeof input
  );
}

function validateWorkerResponse(response: WorkerSuccessResponse): void {
  if (!response || typeof response !== 'object') {
    throw new PixeliftWorkerError('Invalid worker response format');
  }

  const { width, height, result: pixels } = response;

  if (!Number.isInteger(width) || width <= 0) {
    throw new PixeliftWorkerError(`Invalid width in worker response: ${width}`);
  }

  if (!Number.isInteger(height) || height <= 0) {
    throw new PixeliftWorkerError(`Invalid height in worker response: ${height}`);
  }

  const expectedBytes = width * height * 4;
  if (pixels.length !== expectedBytes) {
    throw new PixeliftWorkerError(
      `Pixel buffer size mismatch: expected ${expectedBytes} bytes, got ${pixels.length}`
    );
  }

  throw new PixeliftWorkerError('Worker returned invalid pixel data');
}
/**
 * Recursively collects all transferable objects from an input value.
 * Supports common transferable types like ArrayBuffer, TypedArrays,
 * ImageBitmap, OffscreenCanvas, MessagePort, and nested arrays/objects.
 *
 * @param value The value to extract transferables from.
 * @returns Array of transferable objects ready for postMessage transfer list.
 */
export function getTransferList(value: unknown): Transferable[] {
  const transferList: Transferable[] = [];
  const seen = new Set<unknown>();

  function collect(value: unknown) {
    if (value === null || value === undefined) return;
    if (seen.has(value)) return;
    seen.add(value);

    if (
      value instanceof ArrayBuffer ||
      value instanceof MessagePort ||
      value instanceof ImageBitmap ||
      value instanceof OffscreenCanvas
    ) {
      transferList.push(value);
    } else if (ArrayBuffer.isView(value)) {
      transferList.push(value.buffer);
    } else if (Array.isArray(value)) {
      for (const item of value) collect(item);
    } else if (typeof value === 'object') {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          collect((value as any)[key]);
        }
      }
    }
  }

  collect(value);
  return transferList;
}
