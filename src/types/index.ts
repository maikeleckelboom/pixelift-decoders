export interface PixelData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface DecodeOptions {
  signal?: AbortSignal;
}

export type BrowserInput =
  | string
  | ReadableStream
  | BufferSource
  | SVGElement
  | ImageBitmapSource;
