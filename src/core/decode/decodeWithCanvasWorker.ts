// File: src/core/decode/decodeWithCanvasWorker.ts

import type { WorkerTask, WorkerSuccessResponse } from '@/core/pool/worker-types';
import type { PixelData, ResizeOptions, BrowserInput } from '@/types';
import { workerPool } from '@/core/pool/worker-pool';
import { PixeliftWorkerError, PixeliftInputError, PixeliftDecodeError } from '@/core/error';

const DECODE_TASK_NAME = 'decode' as const;

export function isWorkerSupported(): boolean {
  try {
    if (typeof Worker === 'undefined') return false;
    const blob = new Blob(['self.onmessage = function() {}'], {
      type: 'application/javascript'
    });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    worker.terminate();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function decodeWithCanvasWorker(
  input: BrowserInput,
  options?: { resize?: ResizeOptions }
): Promise<PixelData> {
  try {
    const preparedPayload = await prepareWorkerPayload(input);

    // Ensure the data to be sent to the worker is a Uint8Array
    if (
      preparedPayload.data.type !== 'buffer' ||
      !(preparedPayload.data.buffer instanceof Uint8Array)
    ) {
      throw new PixeliftInputError(
        `Worker task requires a Uint8Array buffer, but received type '${preparedPayload.data.type}' or invalid buffer.`,
        typeof preparedPayload.data.buffer
      );
    }

    const task: WorkerTask = {
      id: Array.from(crypto.randomUUID()).reduce(
        (hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0,
        0
      ),
      type: DECODE_TASK_NAME,
      data: preparedPayload.data.buffer, // MODIFIED: Pass the Uint8Array directly
      resize: options?.resize
    };

    // Expect the full WorkerSuccessResponse object from the worker pool
    const result = await workerPool.executeTask<WorkerSuccessResponse>(
      task,
      preparedPayload.transferables
    );

    validateWorkerResponse(result);

    return {
      data: result.result,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    if (error instanceof PixeliftWorkerError) {
      throw new PixeliftDecodeError('Worker decoding failed', error.message, {
        cause: error
      });
    }
    // Re-throw other errors, including those from validateWorkerResponse if it still throws
    throw error;
  }
}

async function prepareWorkerPayload(input: BrowserInput): Promise<{
  data: { type: string; buffer?: Uint8Array; bitmap?: ImageBitmap; url?: string };
  transferables: Transferable[];
}> {
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
    // Note: If ImageBitmap is passed directly, the worker needs to handle it.
    // The current worker script expects Uint8Array for 'decode' task.
    // This path might need adjustment based on worker capabilities or be disallowed if worker only handles buffers.
    // For now, assuming this path is less common for the 'decode' task expecting a raw buffer.
    // If you intend to send ImageBitmap directly for decoding in worker, worker-script.worker.ts needs to handle `data.type === 'bitmap'`.
    // The current error is related to buffer decoding, so focusing on that.
    // To make this work as is, you would need to convert ImageBitmap to Uint8Array here,
    // or change the worker to accept ImageBitmap.
    // For simplicity and to address the current error, we'll assume 'buffer' type is primary for this worker task.
    // This is a potential area for future enhancement or a bug if ImageBitmaps are expected.
    // For now, to align with the worker expecting a buffer:
    throw new PixeliftInputError(
      'Direct ImageBitmap input to worker for buffer decoding is not directly supported by current worker script; convert to Blob/Uint8Array first.',
      'ImageBitmap'
    );
    // return {
    //   data: { type: 'bitmap', bitmap: input },
    //   transferables: [input]
    // };
  }

  if (typeof input === 'string') {
    // Similar to ImageBitmap, if the worker is to fetch the URL, it needs to be implemented.
    // The current 'decode' task in worker expects a Uint8Array.
    throw new PixeliftInputError(
      'Direct URL input to worker for buffer decoding is not supported; fetch and convert to Blob/Uint8Array first.',
      'string (URL)'
    );
    // return {
    //   data: { type: 'url', url: input },
    //   transferables: []
    // };
  }

  if (input instanceof HTMLImageElement && input.complete && input.naturalWidth > 0) {
    // Convert HTMLImageElement to ImageBitmap then potentially to buffer, or error out like above.
    // For consistency with the worker expecting a buffer:
    const canvas = new OffscreenCanvas(input.naturalWidth, input.naturalHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from OffscreenCanvas');
    ctx.drawImage(input, 0, 0);
    const blob = await canvas.convertToBlob(); // This is an OffscreenCanvas method
    const buffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    return {
      data: { type: 'buffer', buffer: uint8 },
      transferables: [buffer]
    };
  }

  throw new PixeliftInputError(
    'Unsupported input type for worker preparation, or input not ready.',
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

  if (!(pixels instanceof Uint8ClampedArray)) {
    throw new PixeliftWorkerError(`Worker response 'result' is not a Uint8ClampedArray.`);
  }

  const expectedBytes = width * height * 4;
  if (pixels.length !== expectedBytes) {
    throw new PixeliftWorkerError(
      `Pixel buffer size mismatch: expected ${expectedBytes} bytes, got ${pixels.length}`
    );
  }
  // REMOVED: The erroneous throw that was here.
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

  function collect(val: unknown) {
    // Renamed 'value' to 'val' to avoid conflict with outer scope 'value'
    if (val === null || val === undefined) return;
    if (seen.has(val)) return;

    if (
      val instanceof ArrayBuffer ||
      val instanceof MessagePort ||
      val instanceof ImageBitmap ||
      (typeof OffscreenCanvas !== 'undefined' && val instanceof OffscreenCanvas) // Check for OffscreenCanvas existence
    ) {
      seen.add(val); // Add to seen only if it's a transferable type or an object/array we iterate
      transferList.push(val);
    } else if (ArrayBuffer.isView(val)) {
      seen.add(val);
      // Ensure we only add the buffer if it hasn't been added from another view or the buffer itself
      if (!seen.has(val.buffer)) {
        transferList.push(val.buffer);
        seen.add(val.buffer);
      }
    } else if (Array.isArray(val)) {
      seen.add(val);
      for (const item of val) collect(item);
    } else if (typeof val === 'object') {
      seen.add(val);
      for (const key in val) {
        if (Object.prototype.hasOwnProperty.call(val, key)) {
          collect((val as any)[key]);
        }
      }
    }
  }

  collect(value);
  return transferList;
}
