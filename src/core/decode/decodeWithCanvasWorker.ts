import type {
  WorkerRequest,
  WorkerResponse,
  WorkerSuccessResponse
} from '@/core/pool/worker-types';
import type { PixelData, ResizeOptions, BrowserInput } from '@/types';
import { workerPool } from '@/core/pool/worker-pool';
import { PixeliftWorkerError, PixeliftInputError, PixeliftDecodeError } from '@/core/error';

// Worker task registry
const TASK_NAME = 'image-decode';

export async function decodeWithCanvasWorker(
  input: BrowserInput,
  options?: { resize?: ResizeOptions }
): Promise<PixelData> {
  try {
    // Prepare payload with transferables
    const { data, transferables } = await prepareWorkerPayload(input);

    // Execute worker task
    const result = await workerPool.executeTask<WorkerSuccessResponse>(
      {
        type: TASK_NAME,
        data,
        options: {
          resize: options?.resize
        }
      },
      transferables
    );

    // Validate worker response
    validateWorkerResponse(result);

    return {
      data: result.pixels,
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

  const { width, height, pixels } = response;

  if (!Number.isInteger(width) || width <= 0) {
    throw new PixeliftWorkerError(`Invalid width in worker response: ${width}`);
  }

  if (!Number.isInteger(height) || height <= 0) {
    throw new PixeliftWorkerError(`Invalid height in worker response: ${height}`);
  }

  if (!(pixels instanceof Uint8ClampedArray)) {
    throw new PixeliftWorkerError('Worker returned invalid pixel data');
  }

  const expectedBytes = width * height * 4;
  if (pixels.length !== expectedBytes) {
    throw new PixeliftWorkerError(
      `Pixel buffer size mismatch: expected ${expectedBytes} bytes, got ${pixels.length}`
    );
  }
}
