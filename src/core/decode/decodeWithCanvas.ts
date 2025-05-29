import { withCanvas } from '@/core/pool/canvas-pool.ts';
import type { PixelData, ResizeOptions } from '@/types';
import { calculateDrawRectSharpLike } from '@/core/utils/canvas.ts';

/**
 * Decode an ImageBitmapSource into pixel data, optionally resizing it.
 *
 * Note: We create the ImageBitmap at full resolution without resize options
 * to ensure consistent and predictable resizing behavior.
 *
 * The actual resizing is done by drawing onto a canvas using
 * `calculateDrawRectSharpLike` and canvas scaling with smoothing settings.
 *
 * This approach lets us closely replicate Sharp’s resizing algorithms and fit modes,
 * which cannot be guaranteed if relying on the browser's internal resizing via
 * createImageBitmap options like `resizeWidth` or `resizeHeight`.
 *
 * @param source - The image source to decode (e.g., Blob, HTMLImageElement).
 * @param options
 * @param options.resize - Optional resizing options with width, height, and fit mode.
 * @returns PixelData with RGBA pixel buffer and dimensions.
 */
export async function decodeWithCanvas(
  source: ImageBitmapSource,
  options?: {
    resize?: ResizeOptions;
  }
): Promise<PixelData> {
  return withCanvas(async (canvas, settings) => {
    const context = canvas.getContext('2d', settings);
    if (!context) throw new Error('Canvas 2D context not available');

    context.imageSmoothingEnabled = settings.imageSmoothingEnabled;
    context.imageSmoothingQuality = settings.imageSmoothingQuality;

    const imageBitmap = await createImageBitmap(source);

    const targetWidth = options?.resize?.width ?? imageBitmap.width;
    const targetHeight = options?.resize?.height ?? imageBitmap.height;

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    const { sx, sy, sw, sh, dx, dy, dw, dh } = calculateDrawRectSharpLike(
      imageBitmap.width,
      imageBitmap.height,
      {
        width: targetWidth,
        height: targetHeight,
        fit: options?.resize?.fit
      }
    );

    context.drawImage(imageBitmap, sx, sy, sw, sh, dx, dy, dw, dh);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    return {
      data: new Uint8ClampedArray(
        imageData.data.buffer,
        imageData.data.byteOffset,
        imageData.data.byteLength
      ),
      width: canvas.width,
      height: canvas.height
    };
  });
}
