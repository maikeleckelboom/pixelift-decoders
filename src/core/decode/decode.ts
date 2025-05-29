import type { BrowserInput, PixelData, ResizeOptions } from '@/types';
import { decodeWithCanvasWorker } from '@/core/decode/decodeWithCanvasWorker.ts';
import { decodeWithCanvas } from '@/core/decode/decodeWithCanvas.ts';

interface DecodeOptions {
  preferWorker?: boolean;
  resize?: ResizeOptions;
}

export async function decode(
  input: BrowserInput,
  options?: DecodeOptions
): Promise<PixelData> {
  console.log('Pixelift: Decoding input with options:', options);
  return decodeWithCanvas(input, options);
}
