// File: src/core/decode/decodeWithCanvasWorker.ts

import type { WorkerTask, WorkerSuccessResponse } from '@/core/pool/worker-types';
import type { PixelData, ResizeOptions, BrowserInput } from '@/types';
import { workerPool } from '@/core/pool/worker-pool';
import { PixeliftWorkerError, PixeliftInputError, PixeliftDecodeError } from '@/core/error';
import { getTransferList } from '@/core/utils/transfer';

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
  const data = await prepareWorkerPayload(input);

  if (data.type !== 'buffer' || !(data.buffer instanceof Uint8Array)) {
    throw new PixeliftInputError(
      `Worker task requires a Uint8Array buffer, but received type '${data.type}' or invalid buffer.`,
      typeof data.buffer
    );
  }

  try {
    const task: WorkerTask = {
      id: crypto.randomUUID(),
      type: DECODE_TASK_NAME,
      data: data.buffer,
      resize: options?.resize
    };

    const transferList = getTransferList(data.buffer);

    const result = await workerPool.executeTask<WorkerSuccessResponse>(task, transferList);

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
    throw error;
  }
}

async function prepareWorkerPayload(input: BrowserInput): Promise<{
  type: string;
  buffer?: Uint8Array;
  bitmap?: ImageBitmap;
  url?: string;
}> {
  if (input instanceof Uint8Array) {
    return { type: 'buffer', buffer: input };
  }

  if (input instanceof Blob) {
    const buffer = await input.arrayBuffer();
    return { type: 'buffer', buffer: new Uint8Array(buffer) };
  }

  if (input instanceof ImageBitmap) {
    throw new PixeliftInputError(
      'Direct ImageBitmap input to worker for buffer decoding is not directly supported by current worker script; convert to Blob/Uint8Array first.',
      'ImageBitmap'
    );
  }

  if (typeof input === 'string') {
    throw new PixeliftInputError(
      'Direct URL input to worker for buffer decoding is not supported; fetch and convert to Blob/Uint8Array first.',
      'string (URL)'
    );
  }

  if (input instanceof HTMLImageElement && input.complete && input.naturalWidth > 0) {
    const canvas = new OffscreenCanvas(input.naturalWidth, input.naturalHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from OffscreenCanvas');
    ctx.drawImage(input, 0, 0);
    const blob = await canvas.convertToBlob();
    const buffer = await blob.arrayBuffer();
    return { type: 'buffer', buffer: new Uint8Array(buffer) };
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

  const expectedBytes = width * height * 4;
  if (pixels.length !== expectedBytes) {
    throw new PixeliftWorkerError(
      `Pixel buffer size mismatch: expected ${expectedBytes} bytes, got ${pixels.length}`
    );
  }
}
