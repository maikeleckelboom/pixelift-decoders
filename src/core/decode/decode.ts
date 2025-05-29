import type { BrowserInput, PixelData, ResizeOptions } from '@/types';
import { decodeWithCanvasWorker } from '@/core/decode/decodeWithCanvasWorker.ts';
import { decodeWithCanvas } from '@/core/decode/decodeWithCanvas.ts';

interface DecodeOptions {
  preferWorker?: boolean;
  resize?: ResizeOptions;
}

export async function decode(
  input: ImageBitmapSource,
  options?: DecodeOptions
): Promise<PixelData> {
  const preferWorker = options?.preferWorker ?? true;

  if (preferWorker) {
    return decodeWithCanvasWorker(input, options);
  }

  return decodeWithCanvas(input, options);
}
