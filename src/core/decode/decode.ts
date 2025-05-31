import type { PixelData, ResizeOptions } from '@/types';
import { decodeWithCanvas } from '@/decoders/canvas/decodeWithCanvas.ts';

export interface DecodeOptions {
  resize?: ResizeOptions;
}

export async function decode(
  input: ImageBitmapSource,
  options?: DecodeOptions
): Promise<PixelData> {
  return await decodeWithCanvas(input, options);
}
