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

export function calculateDrawRectSharpLike(
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

  let dw = targetW; // Default destination width is targetW
  let dh = targetH; // Default destination height is targetH

  switch (fit) {
    case 'contain':
    case 'inside': {
      const shouldSkipResizeForInside =
        fit === 'inside' && srcWidth <= targetW && srcHeight <= targetH;

      if (shouldSkipResizeForInside) {
        // For 'inside' when source is smaller or fits: draw source at original size.
        dw = srcWidth;
        dh = srcHeight;
      } else {
        // For 'contain', or 'inside' when a source is larger:
        // Scale down to fit within target dimensions, preserving aspect ratio.
        if (srcAspect > targetAspect) {
          // Source is wider than a target aspect (letterbox)
          dh = Math.round(targetW / srcAspect);
          // dw is already targetW
        } else {
          // Source is taller than a target aspect (pillarbox) or same aspect
          dw = Math.round(targetH * srcAspect);
          // dh is already targetH
        }
      }
      break;
    }

    case 'cover':
    case 'outside': {
      // For 'cover' and 'outside' (when width & height are provided),
      // behavior is the same: cover target, crop if needed, result is targetW x targetH.
      if (srcAspect > targetAspect) {
        // Source is wider than target aspect
        // Crop source width to match target aspect. Use full source height for calculation.
        sh = srcHeight; // Use full source height to calculate sw based on targetAspect
        sw = Math.round(sh * targetAspect);
        sx = Math.round((srcWidth - sw) / 2); // Center the crop horizontally
      } else {
        // Source is taller than target aspect or same aspect
        // Crop source height to match target aspect. Use full source width for calculation.
        sw = srcWidth; // Use full source width to calculate sh based on targetAspect
        sh = Math.round(sw / targetAspect);
        sy = Math.round((srcHeight - sh) / 2); // Center the crop vertically
      }
      // For these fits, the destination dimensions are always the target dimensions.
      dw = targetW;
      dh = targetH;
      break;
    }

    case 'fill':
    default: {
      // Stretch to fill — no crop, aspect ratio is not preserved.
      // sx, sy, sw, sh remain full source.
      // dw, dh are already targetW, targetH.
      break;
    }
  }

  // Calculate destination x, y to center the (potentially smaller) dw, dh
  // within the targetW, targetH canvas area.
  // This primarily affects 'contain' and 'inside' (when not upscaling).
  // For 'cover', 'outside', and 'fill', dw=targetW and dh=targetH, so dx,dy will be 0.
  const dx = Math.round((targetW - dw) / 2);
  const dy = Math.round((targetH - dh) / 2);

  return { sx, sy, sw, sh, dx, dy, dw, dh };
}
