import type { BrowserInput, PixelData, ResizeOptions } from '@/types';
import {
  decodeWithCanvasWorker,
  isWorkerSupported
} from '@/core/decode/decodeWithCanvasWorker.ts';
import { decodeWithCanvas } from '@/core/decode/decodeWithCanvas.ts';

export interface DecodeOptions {
  preferWorker?: boolean;
  resize?: ResizeOptions;
}

export async function decode(
  input: ImageBitmapSource,
  options?: DecodeOptions
): Promise<PixelData> {
  if (options?.preferWorker && isWorkerSupported()) {
    console.log('👷️ Using worker decode path');
    try {
      return await decodeWithCanvasWorker(input, options);
    } catch (e) {
      console.warn('Worker decode failed, falling back to canvas:', e);
    }
  }

  console.log('🖼️ Using canvas decode path');

  return await decodeWithCanvas(input, options);
}
