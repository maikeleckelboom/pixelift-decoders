import { streamToUint8Array } from '@/core/fn/streamToUint8Array.ts';
import { sanitizeSVGElement } from '@/core/fn/sanitizeSVGElement.ts';
import type { BrowserInput } from '@/types';

export async function normalizeBrowserInput(
  input: BrowserInput,
  options?: {
    onProgress?: (loaded: number) => void;
  }
): Promise<ImageBitmapSource | Uint8Array> {
  if (typeof input === 'string') {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const blob = await res.blob();
    return createImageBitmap(blob);
  }

  if (input instanceof ReadableStream) {
    const buffer = await streamToUint8Array(input, options?.onProgress);
    const blob = new Blob([buffer]);
    return createImageBitmap(blob);
  }

  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  if (input instanceof SVGElement) {
    const sanitizedString = sanitizeSVGElement(input);
    const blob = new Blob([sanitizedString], { type: 'image/svg+xml' });
    return createImageBitmap(blob);
  }

  if (
    input instanceof ImageBitmap ||
    input instanceof HTMLImageElement ||
    input instanceof HTMLCanvasElement
  ) {
    return input;
  }

  if (typeof VideoFrame !== 'undefined' && input instanceof VideoFrame) {
    return input;
  }

  throw new Error('Unsupported input type for image decoding');
}
