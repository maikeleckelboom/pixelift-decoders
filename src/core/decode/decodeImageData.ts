import { withCanvas } from '@/core/pool/canvas-pool.ts';
import type { PixelData, ResizeOptions } from '@/types';
import { createConcurrencyPool } from '@/core/pool/create-concurrency-pool.ts';
import { calculateDrawRectSharpLike } from '@/core/utils/canvas.ts';

const limitConcurrentDecodes = createConcurrencyPool(5);

export async function decodeConcurrentWithCanvas(
  source: ImageBitmapSource,
  options?: {
    resize?: ResizeOptions;
  }
): Promise<PixelData> {
  return limitConcurrentDecodes(async () => {
    return withCanvas(async (canvas) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      const imageBitmap = await createImageBitmap(source);

      const targetWidth = options?.resize?.width ?? imageBitmap.width;
      const targetHeight = options?.resize?.height ?? imageBitmap.height;

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { dx, dy, dw, dh } = calculateDrawRectSharpLike(
        imageBitmap.width,
        imageBitmap.height,
        {
          width: targetWidth,
          height: targetHeight,
          fit: options?.resize?.fit
        }
      );

      ctx.drawImage(imageBitmap, dx, dy, dw, dh);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

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
  });
}
