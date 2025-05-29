import { calculateDrawRectSharpLike } from '@/core/utils/canvas';
import { getCanvasDefaultSettings } from '@/decoders/canvas/defaults';

const canvasPool: OffscreenCanvas[] = [];
const ctxPool: Record<number, OffscreenCanvasRenderingContext2D> = {};

function getCanvas(
  width: number,
  height: number
): {
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
} {
  // Try to find matching canvas in pool
  for (const canvas of canvasPool) {
    if (canvas.width === width && canvas.height === height) {
      const ctx = ctxPool[canvas.width];
      return { canvas, ctx: ctx! };
    }
  }

  // Create new canvas
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', getCanvasDefaultSettings());
  if (!ctx) throw new Error('Failed to create canvas context');

  // Add to pools
  canvasPool.push(canvas);
  ctxPool[canvas.width] = ctx;

  return { canvas, ctx };
}

self.onmessage = async (event: MessageEvent<WorkerTask>) => {
  const { id, type, data, options } = event.data;

  try {
    if (type !== 'image-decode') {
      throw new Error(`Unsupported task type: ${type}`);
    }

    let imageBitmap: ImageBitmap;

    // Handle different input types
    if (data.type === 'bitmap') {
      imageBitmap = data.bitmap;
    } else if (data.type === 'buffer') {
      const blob = new Blob([data.buffer]);
      imageBitmap = await createImageBitmap(blob);
    } else if (data.type === 'url') {
      const response = await fetch(data.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      imageBitmap = await createImageBitmap(blob);
    } else {
      throw new Error('Invalid data type');
    }

    // Calculate target dimensions
    const targetWidth = options?.resize?.width ?? imageBitmap.width;
    const targetHeight = options?.resize?.height ?? imageBitmap.height;

    // Get canvas from pool
    const { canvas, ctx } = getCanvas(targetWidth, targetHeight);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate draw parameters
    const { sx, sy, sw, sh, dx, dy, dw, dh } = calculateDrawRectSharpLike(
      imageBitmap.width,
      imageBitmap.height,
      {
        width: targetWidth,
        height: targetHeight,
        fit: options?.resize?.fit
      }
    );

    // Draw and extract pixels
    ctx.drawImage(imageBitmap, sx, sy, sw, sh, dx, dy, dw, dh);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Cleanup
    imageBitmap.close();

    // Send response with transferable
    self.postMessage(
      {
        id,
        type: 'success',
        result: {
          pixels: imageData.data,
          width: canvas.width,
          height: canvas.height
        }
      },
      [imageData.data.buffer]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({
      id,
      type: 'error',
      error: {
        message,
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Error'
      }
    });
  }
};
