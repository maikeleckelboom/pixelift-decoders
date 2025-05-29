import type { ResizeOptions } from '@/types';

/**
 * Sharp-style resize logic. Returns where to draw the image in the target canvas,
 * including the destination size (dw/dh) and offset (dx/dy).
 */
export function calculateDrawRectSharpLike(
  srcWidth: number,
  srcHeight: number,
  { width: targetW, height: targetH, fit = 'cover' }: ResizeOptions
): { dx: number; dy: number; dw: number; dh: number } {
  const srcAspect = srcWidth / srcHeight;
  const targetAspect = targetW / targetH;

  let dw = targetW;
  let dh = targetH;

  switch (fit) {
    case 'contain':
    case 'inside': {
      const shouldSkipResize =
        fit === 'inside' && srcWidth <= targetW && srcHeight <= targetH;
      if (shouldSkipResize) {
        dw = srcWidth;
        dh = srcHeight;
      } else if (srcAspect > targetAspect) {
        dw = targetW;
        dh = Math.round(targetW / srcAspect);
      } else {
        dh = targetH;
        dw = Math.round(targetH * srcAspect);
      }
      break;
    }

    case 'cover':
    case 'outside': {
      const shouldSkipResize =
        fit === 'outside' && srcWidth >= targetW && srcHeight >= targetH;
      if (shouldSkipResize) {
        dw = srcWidth;
        dh = srcHeight;
      } else if (srcAspect > targetAspect) {
        dh = targetH;
        dw = Math.round(targetH * srcAspect);
      } else {
        dw = targetW;
        dh = Math.round(targetW / srcAspect);
      }
      break;
    }

    case 'fill':
    default: {
      dw = targetW;
      dh = targetH;
      break;
    }
  }

  const dx = Math.round((targetW - dw) / 2);
  const dy = Math.round((targetH - dh) / 2);

  return { dx, dy, dw, dh };
}
