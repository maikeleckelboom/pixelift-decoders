import type { PixelData, ResizeOptions } from '@/types';
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
    // console.log('👷️ Using worker for canvas decode');
    try {
      return await decodeWithCanvasWorker(input, options);
    } catch (e) {
      console.warn('Worker decode failed, failing back to canvas:', e);
    }
  } else {
    // console.log('🧵 Using main thread for canvas decode');
  }

  return await decodeWithCanvas(input, options);
}
