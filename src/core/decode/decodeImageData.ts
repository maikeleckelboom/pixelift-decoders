import { withCanvas } from '@/core/pool/canvas-pool.ts';
import type { PixelData } from '@/types';
import { createConcurrencyPool } from '@/core/pool/create-concurrency-pool.ts';

const limitConcurrentDecodes = createConcurrencyPool(5);

/**
 * Decode image data to pixel data using pooled OffscreenCanvas
 * Concurrency limited and safe.
 */
export async function decodeImage(imageData: ImageData): Promise<PixelData> {
  return limitConcurrentDecodes(async () => {
    return withCanvas(async (canvas) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      canvas.width = imageData.width;
      canvas.height = imageData.height;

      ctx.putImageData(imageData, 0, 0);

      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      return {
        data: new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength),
        width: canvas.width,
        height: canvas.height
      };
    });
  });
}
