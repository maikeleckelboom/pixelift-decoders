import type { PixelData, ResizeOptions } from '@/types';
import { calculateSharpResizeRect } from '@/core/fn/calculateSharpResizeRect.ts';
import {
  CANVAS_IMAGE_SMOOTHING_SETTINGS,
  CANVAS_RENDERING_CONTEXT_2D_SETTINGS
} from '@/decoders/canvas/defaults.ts';
import { OffscreenCanvasPool } from '@/core/pool/OffscreenCanvasPool.ts';

const canvasPool = new OffscreenCanvasPool(2048, 2048, navigator.hardwareConcurrency);

export interface DecodeWithCanvasOptions {
  resize?: ResizeOptions;
  imageSmoothingQuality?: ImageSmoothingQuality;
}

/**
 * Decode an ImageBitmapSource into pixel data, optionally resizing it.
 * Uses pooled OffscreenCanvas instances for concurrent, efficient usage.
 *
 * @param source - The image source to decode (e.g., Blob, HTMLImageElement).
 * @param options - Optional resize options: width, height, fit, smoothing.
 * @returns PixelData with RGBA pixel buffer and dimensions.
 */
export async function decodeWithCanvas(
  source: ImageBitmapSource,
  options?: DecodeWithCanvasOptions
): Promise<PixelData> {
  const { imageSmoothingQuality } = options ?? {};

  const resize = validateResizeOptions(options);

  const imageBitmap = await createImageBitmap(source);

  const targetWidth = resize?.width ?? imageBitmap.width;
  const targetHeight = resize?.height ?? imageBitmap.height;

  const canvas = await canvasPool.acquire();

  try {
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d', CANVAS_RENDERING_CONTEXT_2D_SETTINGS);
    if (!ctx) throw new Error('Canvas 2D context not available');

    ctx.clearRect(0, 0, targetWidth, targetHeight);

    if (
      resize &&
      (targetWidth !== imageBitmap.width || targetHeight !== imageBitmap.height)
    ) {
      ctx.imageSmoothingEnabled = CANVAS_IMAGE_SMOOTHING_SETTINGS.imageSmoothingEnabled;
      ctx.imageSmoothingQuality =
        imageSmoothingQuality ?? CANVAS_IMAGE_SMOOTHING_SETTINGS.imageSmoothingQuality;
    }

    const { sx, sy, sw, sh, dx, dy, dw, dh } = calculateSharpResizeRect(
      imageBitmap.width,
      imageBitmap.height,
      {
        width: targetWidth,
        height: targetHeight,
        fit: resize?.fit
      }
    );

    ctx.drawImage(imageBitmap, sx, sy, sw, sh, dx, dy, dw, dh);

    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

    return {
      data: imageData.data,
      width: targetWidth,
      height: targetHeight
    };
  } finally {
    imageBitmap.close();
    canvasPool.release(canvas);
  }
}

function validateResizeOptions(
  options?: DecodeWithCanvasOptions
): ResizeOptions | undefined {
  if (!options?.resize) return undefined;

  const { width, height, fit } = options.resize;

  if (width <= 0 || height <= 0) {
    throw new Error('Resize dimensions must be positive integers');
  }

  if (fit && !['cover', 'contain', 'fill', 'inside', 'outside'].includes(fit)) {
    throw new Error(`Invalid fit mode: ${fit}`);
  }

  return { width, height, fit };
}
