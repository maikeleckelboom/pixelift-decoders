export interface PixelData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export type BrowserInput =
  | string
  | ReadableStream
  | BufferSource
  | Uint8Array
  | SVGElement
  | ImageBitmapSource;

export type FitMode = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

export interface ResizeOptions {
  width: number;
  height: number;
  fit?: FitMode | undefined;
}
