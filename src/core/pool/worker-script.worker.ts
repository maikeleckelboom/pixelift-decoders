import type {
  WorkerErrorResponse,
  WorkerSuccessResponse,
  WorkerTask
} from '@/core/pool/worker-types.ts';
import { calculateDrawRectSharpLike } from '@/core/utils/canvas.ts';
import { PixeliftWorkerError } from '@/core/error.ts';

// Worker state: reuse single OffscreenCanvas and context to reduce overhead
let canvas: OffscreenCanvas | null = null;
let context: OffscreenCanvasRenderingContext2D | null = null;

/**
 * Initialize or reuse OffscreenCanvas and its 2D context.
 */
function ensureCanvasAndContext(
  width: number,
  height: number
): OffscreenCanvasRenderingContext2D {
  // Reuse canvas if dimensions match
  if (canvas && canvas.width === width && canvas.height === height && context) {
    return context;
  }

  // Create new canvas if needed
  canvas = new OffscreenCanvas(width, height);
  context = canvas.getContext('2d', {
    willReadFrequently: true,
    alpha: true
  } as CanvasRenderingContext2DSettings);

  if (!context) {
    throw new PixeliftWorkerError(
      'Failed to get 2D context from OffscreenCanvas in worker.'
    );
  }

  return context;
}

/**
 * Decode and resize image, returning raw pixel data.
 */
async function processImage(
  imageData: Uint8Array,
  resizeOptions?: WorkerTask['resize']
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const blob = new Blob([imageData], { type: 'image/png' });
  let imageBitmap: ImageBitmap | null = null;

  try {
    // Create image bitmap from blob
    imageBitmap = await createImageBitmap(blob);

    const targetWidth = resizeOptions?.width ?? imageBitmap.width;
    const targetHeight = resizeOptions?.height ?? imageBitmap.height;

    // Skip canvas operations if no resize needed and original dimensions match
    if (
      !resizeOptions &&
      targetWidth === imageBitmap.width &&
      targetHeight === imageBitmap.height
    ) {
      const canvas = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context');

      ctx.drawImage(imageBitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

      return {
        data: imageData.data,
        width: imageData.width,
        height: imageData.height
      };
    }

    const ctx = ensureCanvasAndContext(targetWidth, targetHeight);
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    const drawRect = calculateDrawRectSharpLike(imageBitmap.width, imageBitmap.height, {
      width: targetWidth,
      height: targetHeight,
      fit: resizeOptions?.fit
    });

    ctx.drawImage(
      imageBitmap,
      drawRect.sx,
      drawRect.sy,
      drawRect.sw,
      drawRect.sh,
      drawRect.dx,
      drawRect.dy,
      drawRect.dw,
      drawRect.dh
    );

    const outputImageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

    return {
      data: outputImageData.data,
      width: outputImageData.width,
      height: outputImageData.height
    };
  } finally {
    // Always close ImageBitmap to prevent memory leaks
    imageBitmap?.close();
  }
}

/**
 * Message handler for worker.
 */
self.onmessage = async (event: MessageEvent<WorkerTask>) => {
  const { id, type, data, resize } = event.data;

  if (type !== 'decode') {
    const unknownTypeError: WorkerErrorResponse = {
      id,
      type: 'error',
      error: {
        name: 'UnknownTypeError',
        message: `Unknown type received by worker: ${type}`
      }
    };
    self.postMessage(unknownTypeError);
    return;
  }

  try {
    const result = await processImage(data, resize);
    const response: WorkerSuccessResponse = {
      id,
      type: 'success',
      width: result.width,
      height: result.height,
      result: result.data
    };

    // Transfer pixel data buffer directly (zero-copy)
    self.postMessage(response, [result.data.buffer]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResponse: WorkerErrorResponse = {
      id,
      type: 'error',
      error: {
        message: `Worker processing failed: ${errorMessage}`
      }
    };
    self.postMessage(errorResponse);
  }
};
// ... existing imports ...

/**
 * Global error handler for the worker.
 * Handles both Event-based errors and legacy string-based errors.
 */
self.onerror = function (e: string | Event) {
  let errorMessage = 'An unknown error occurred in the worker';
  let errorStack = 'No stack trace available';

  if (typeof e === 'string') {
    errorMessage = e;
  } else if (e instanceof ErrorEvent) {
    if (e.preventDefault) e.preventDefault();
    errorMessage = e.message || errorMessage;
    errorStack = e.error?.stack ?? errorStack;
  } else if (e instanceof Event) {
    if (e.preventDefault) e.preventDefault();
    errorMessage = 'Unhandled event error';
  }

  const errorResponse: WorkerErrorResponse = {
    id: crypto.randomUUID(),
    type: 'error',
    error: {
      name: 'WorkerError',
      message: errorMessage,
      stack: errorStack
    }
  };

  self.postMessage(errorResponse);
  return true;
};
