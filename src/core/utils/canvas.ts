import type { BrowserInput, ResizeOptions } from '@/types';

export function calculateDrawRectSharpLike(
  srcWidth: number,
  srcHeight: number,
  { width: targetW, height: targetH, fit = 'cover' }: ResizeOptions
) {
  const srcAspect = srcWidth / srcHeight;
  const targetAspect = targetW / targetH;

  let sx = 0,
    sy = 0,
    sw = srcWidth,
    sh = srcHeight;

  let dw = targetW,
    dh = targetH;

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
        // Crop width
        sh = srcHeight;
        sw = Math.round(sh * targetAspect);
        sx = Math.round((srcWidth - sw) / 2);

        dw = targetW;
        dh = targetH;
      } else {
        // Crop height
        sw = srcWidth;
        sh = Math.round(sw / targetAspect);
        sy = Math.round((srcHeight - sh) / 2);

        dw = targetW;
        dh = targetH;
      }
      break;
    }

    case 'fill':
    default: {
      // Stretch to fill — no crop
      sx = 0;
      sy = 0;
      sw = srcWidth;
      sh = srcHeight;

      dw = targetW;
      dh = targetH;
      break;
    }
  }

  // Center the image if it doesn't fill the entire target (contain / inside)
  const dx = Math.round((targetW - dw) / 2);
  const dy = Math.round((targetH - dh) / 2);

  return { sx, sy, sw, sh, dx, dy, dw, dh };
}
