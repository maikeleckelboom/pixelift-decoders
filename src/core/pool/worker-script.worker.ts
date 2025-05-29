import type {
  WorkerErrorResponse,
  WorkerSuccessResponse,
  WorkerTask
} from '@/core/pool/worker-types.ts';
import { calculateDrawRectSharpLike } from '@/core/utils/canvas.ts';
import { PixeliftWorkerError } from '@/core/error.ts'; // Custom error type

// Worker state: reuse single OffscreenCanvas and context to reduce overhead
let offscreenCanvas: OffscreenCanvas | null = null;
let context: OffscreenCanvasRenderingContext2D | null = null;

/**
 * Initialize or reuse OffscreenCanvas and its 2D context.
 */
function ensureCanvasAndContext(
  width: number,
  height: number
): OffscreenCanvasRenderingContext2D {
  if (
    !offscreenCanvas ||
    offscreenCanvas.width !== width ||
    offscreenCanvas.height !== height
  ) {
    offscreenCanvas = new OffscreenCanvas(width, height);
    context = offscreenCanvas.getContext('2d', {
      // Add context defaults here if needed, e.g.:
      // alpha: false,
      // desynchronized: true
    });
    if (!context) {
      throw new PixeliftWorkerError(
        'Failed to get 2D context from OffscreenCanvas in worker.'
      );
    }
  } else if (!context) {
    context = offscreenCanvas.getContext('2d');
    if (!context) {
      throw new PixeliftWorkerError(
        'Failed to re-acquire 2D context from OffscreenCanvas in worker.'
      );
    }
  }
  // Make sure canvas size is updated (important if dimensions changed)
  if (offscreenCanvas.width !== width) offscreenCanvas.width = width;
  if (offscreenCanvas.height !== height) offscreenCanvas.height = height;

  return context;
}

/**
 * Decode and resize image, returning raw pixel data.
 */
async function processImage(
  imageData: Uint8Array,
  resizeOptions?: WorkerTask['resize']
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const blob = new Blob([imageData]);
  let imageBitmap: ImageBitmap | null = null;

  try {
    imageBitmap = await createImageBitmap(blob);

    const targetWidth = resizeOptions?.width ?? imageBitmap.width;
    const targetHeight = resizeOptions?.height ?? imageBitmap.height;

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
      width: targetWidth,
      height: targetHeight
    };
  } finally {
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

/**
 * Global error handler for the worker.
 */
self.onerror = (event) => {
  return false;
};
