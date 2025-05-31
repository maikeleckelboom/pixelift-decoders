import type { PixelData, ResizeOptions } from '@/types';
import { calculateResizeRect } from '@/core/fn/calculateResizeRect.ts';
import {
  CANVAS_IMAGE_SMOOTHING,
  CANVAS_RENDERING_CONTEXT_2D_SETTINGS
} from '@/decoders/canvas/defaults.ts';
import { OffscreenCanvasPool, type Pool } from '@/core/pool/OffscreenCanvasPool.ts';

const canvasPool = new OffscreenCanvasPool(
  2048,
  2048,
  Math.max(1, navigator.hardwareConcurrency - 1)
);

export interface DecodeWithCanvasOptions {
  signal?: AbortSignal;
  quality?: ImageSmoothingQuality;
  resize?: ResizeOptions;
}

export function decodeWithCanvas(
  source: ImageBitmapSource,
  optionsOrPool?: DecodeWithCanvasOptions | Pool,
  maybeOptions?: DecodeWithCanvasOptions
): Promise<PixelData>;

export async function decodeWithCanvas(
  source: ImageBitmapSource,
  optionsOrPool?: DecodeWithCanvasOptions | Pool,
  maybeOptions?: DecodeWithCanvasOptions
): Promise<PixelData> {
  const pool = hasPool(optionsOrPool) ? optionsOrPool : canvasPool;
  const options = hasPool(optionsOrPool) ? maybeOptions : optionsOrPool;
  const resize = validateResizeOptions(options);

  const imageBitmap = await createImageBitmap(source);
  const targetWidth = resize?.width ?? imageBitmap.width;
  const targetHeight = resize?.height ?? imageBitmap.height;

  const canvas = await pool.acquire(options?.signal);

  try {
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d', CANVAS_RENDERING_CONTEXT_2D_SETTINGS);
    if (!ctx) throw new Error('Canvas 2D context not available');

    if (
      resize &&
      (targetWidth !== imageBitmap.width || targetHeight !== imageBitmap.height)
    ) {
      ctx.imageSmoothingEnabled = CANVAS_IMAGE_SMOOTHING.imageSmoothingEnabled;
      ctx.imageSmoothingQuality =
        options?.quality ?? CANVAS_IMAGE_SMOOTHING.imageSmoothingQuality;
    }

    const { sx, sy, sw, sh, dx, dy, dw, dh } = calculateResizeRect(
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
    pool.release(canvas);
  }
}

function hasPool(input: unknown): input is Pool {
  return !!input && typeof input === 'object' && 'acquire' in input && 'release' in input;
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
