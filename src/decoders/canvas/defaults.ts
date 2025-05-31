export const IMAGE_BITMAP_OPTIONS: ImageBitmapOptions = {
  imageOrientation: 'none',
  premultiplyAlpha: 'default'
} as const;

export const IMAGE_DATA_SETTINGS: ImageDataSettings = {
  colorSpace: 'srgb'
} as const;

export const CANVAS_IMAGE_SMOOTHING: CanvasImageSmoothing = {
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high'
} as const;

export const CANVAS_RENDERING_CONTEXT_2D_SETTINGS: CanvasRenderingContext2DSettings = {
  alpha: true,
  willReadFrequently: true
} as const;
