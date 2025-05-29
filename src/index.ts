import type { BrowserInput } from './types';

function getTransferList(input: BrowserInput): Transferable[] {
  if (input instanceof Uint8Array) {
    return [input.buffer];
  }
  if (input instanceof ArrayBuffer) {
    return [input];
  }
  if (ArrayBuffer.isView(input)) {
    return [input.buffer];
  }
  if (typeof ReadableStream !== 'undefined' && input instanceof ReadableStream) {
    return [input];
  }
  if (typeof ImageBitmap !== 'undefined' && input instanceof ImageBitmap) {
    return [input];
  }
  if (typeof OffscreenCanvas !== 'undefined' && input instanceof OffscreenCanvas) {
    return [input];
  }
  if (typeof ImageData !== 'undefined' && input instanceof ImageData) {
    return [input.data.buffer];
  }
  return [];
}

export function normalizeInputToUint8Array(input: BrowserInput): Uint8Array {
  if (typeof input === 'string') {
    return new TextEncoder().encode(input);
  }
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ImageData) {
    return new Uint8Array(input.data.buffer);
  }
  throw new Error('Unsupported input type for worker');
}
