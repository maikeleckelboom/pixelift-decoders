import type { ResizeOptions } from '@/types';

export interface ResizeRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export function calculateResizeRect(
  srcWidth: number,
  srcHeight: number,
  { width: targetW, height: targetH, fit = 'cover' }: ResizeOptions
): ResizeRect {
  const srcAspect = srcWidth / srcHeight;
  const targetAspect = targetW / targetH;

  let sx = 0,
    sy = 0,
    sw = srcWidth,
    sh = srcHeight;

  let dw = targetW;
  let dh = targetH;

  switch (fit) {
    case 'contain':
    case 'inside': {
      const shouldSkipResizeForInside =
        fit === 'inside' && srcWidth <= targetW && srcHeight <= targetH;

      if (shouldSkipResizeForInside) {
        dw = srcWidth;
        dh = srcHeight;
      } else {
        if (srcAspect > targetAspect) {
          dh = Math.round(targetW / srcAspect);
        } else {
          dw = Math.round(targetH * srcAspect);
        }
      }
      break;
    }

    case 'cover':
    case 'outside': {
      if (srcAspect > targetAspect) {
        sh = srcHeight;
        sw = Math.round(sh * targetAspect);
        sx = Math.round((srcWidth - sw) / 2);
      } else {
        sw = srcWidth;
        sh = Math.round(sw / targetAspect);
        sy = Math.round((srcHeight - sh) / 2);
      }
      dw = targetW;
      dh = targetH;
      break;
    }

    case 'fill':
    default: {
      break;
    }
  }

  const dx = Math.round((targetW - dw) / 2);
  const dy = Math.round((targetH - dh) / 2);

  return { sx, sy, sw, sh, dx, dy, dw, dh };
}
