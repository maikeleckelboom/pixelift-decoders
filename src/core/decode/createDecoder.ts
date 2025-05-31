import { decodeWithCanvas } from '../../decoders/canvas/decodeWithCanvas.ts';
import type { ResizeOptions } from '@/types';

export function createCanvasDecoder() {
  return {
    decode: (source: ImageBitmapSource, options?: { resize?: ResizeOptions }) =>
      decodeWithCanvas(source, options)
  };
}
