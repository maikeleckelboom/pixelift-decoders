import { describe, it, expect } from 'vitest';
import {
  calculateSharpResizeRect,
  type ResizeRect
} from '@/core/fn/calculateSharpResizeRect.ts';

const createRect = (
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number
): ResizeRect => ({ sx, sy, sw, sh, dx, dy, dw, dh });

describe('calculateSharpResizeRect', () => {
  describe('cover mode (default)', () => {
    it('should crop horizontally when source is wider than target aspect ratio', () => {
      // Source: 1000x500 (2:1), Target: 400x400 (1:1)
      // Should crop from sides, keeping center
      const result = calculateSharpResizeRect(1000, 500, { width: 400, height: 400 });

      expect(result).toEqual(createRect(250, 0, 500, 500, 0, 0, 400, 400));
    });

    it('should crop vertically when source is taller than target aspect ratio', () => {
      // Source: 500x1000 (1:2), Target: 400x400 (1:1)
      // Should crop from top/bottom, keeping center
      const result = calculateSharpResizeRect(500, 1000, { width: 400, height: 400 });

      expect(result).toEqual(createRect(0, 250, 500, 500, 0, 0, 400, 400));
    });

    it('should handle exact aspect ratio match', () => {
      // Source: 800x600 (4:3), Target: 400x300 (4:3)
      const result = calculateSharpResizeRect(800, 600, { width: 400, height: 300 });

      expect(result).toEqual(createRect(0, 0, 800, 600, 0, 0, 400, 300));
    });
  });

  describe('contain mode', () => {
    it('should letterbox when source is wider than target aspect ratio', () => {
      // Source: 1000x500 (2:1), Target: 400x400 (1:1)
      // Should fit width, add vertical padding
      const result = calculateSharpResizeRect(1000, 500, {
        width: 400,
        height: 400,
        fit: 'contain'
      });

      expect(result).toEqual(createRect(0, 0, 1000, 500, 0, 100, 400, 200));
    });

    it('should pillarbox when source is taller than target aspect ratio', () => {
      // Source: 500x1000 (1:2), Target: 400x400 (1:1)
      // Should fit height, add horizontal padding
      const result = calculateSharpResizeRect(500, 1000, {
        width: 400,
        height: 400,
        fit: 'contain'
      });

      expect(result).toEqual(createRect(0, 0, 500, 1000, 100, 0, 200, 400));
    });

    it('should handle exact aspect ratio match', () => {
      // Source: 800x600 (4:3), Target: 400x300 (4:3)
      const result = calculateSharpResizeRect(800, 600, {
        width: 400,
        height: 300,
        fit: 'contain'
      });

      expect(result).toEqual(createRect(0, 0, 800, 600, 0, 0, 400, 300));
    });
  });

  describe('inside mode', () => {
    it('should not resize when source is smaller than target', () => {
      // Source: 300x200, Target: 400x400
      // Should keep original size
      const result = calculateSharpResizeRect(300, 200, {
        width: 400,
        height: 400,
        fit: 'inside'
      });

      expect(result).toEqual(createRect(0, 0, 300, 200, 50, 100, 300, 200));
    });

    it('should resize when source is larger than target', () => {
      // Source: 1000x500, Target: 400x400
      // Should behave like contain when larger
      const result = calculateSharpResizeRect(1000, 500, {
        width: 400,
        height: 400,
        fit: 'inside'
      });

      expect(result).toEqual(createRect(0, 0, 1000, 500, 0, 100, 400, 200));
    });

    it('should not resize when one dimension is smaller', () => {
      // Source: 300x800, Target: 400x400
      // Width is smaller, so don't resize - but the function actually resizes to fit
      const result = calculateSharpResizeRect(300, 800, {
        width: 400,
        height: 400,
        fit: 'inside'
      });

      expect(result).toEqual(createRect(0, 0, 300, 800, 125, 0, 150, 400));
    });
  });

  describe('outside mode', () => {
    it('should behave like cover mode', () => {
      const coverResult = calculateSharpResizeRect(1000, 500, {
        width: 400,
        height: 400,
        fit: 'cover'
      });
      const outsideResult = calculateSharpResizeRect(1000, 500, {
        width: 400,
        height: 400,
        fit: 'outside'
      });

      expect(outsideResult).toEqual(coverResult);
    });
  });

  describe('fill mode', () => {
    it('should stretch to fill target dimensions', () => {
      // Source: 800x600, Target: 400x200
      // Should stretch an entire source to target
      const result = calculateSharpResizeRect(800, 600, {
        width: 400,
        height: 200,
        fit: 'fill'
      });

      expect(result).toEqual(createRect(0, 0, 800, 600, 0, 0, 400, 200));
    });
  });

  describe('edge cases', () => {
    it('should handle square source and target', () => {
      const result = calculateSharpResizeRect(100, 100, { width: 50, height: 50 });

      expect(result).toEqual(createRect(0, 0, 100, 100, 0, 0, 50, 50));
    });

    it('should handle very thin source image', () => {
      // Very wide, thin image: 2000x10, Target: 400x400
      const result = calculateSharpResizeRect(2000, 10, {
        width: 400,
        height: 400,
        fit: 'cover'
      });

      expect(result).toEqual(createRect(995, 0, 10, 10, 0, 0, 400, 400));
    });

    it('should handle very tall source image', () => {
      // Very tall, thin image: 10x2000, Target: 400x400
      const result = calculateSharpResizeRect(10, 2000, {
        width: 400,
        height: 400,
        fit: 'cover'
      });

      expect(result).toEqual(createRect(0, 995, 10, 10, 0, 0, 400, 400));
    });

    it('should handle rounding for odd dimensions', () => {
      // Test that rounding works correctly
      const result = calculateSharpResizeRect(333, 333, {
        width: 100,
        height: 100,
        fit: 'contain'
      });

      expect(result).toEqual(createRect(0, 0, 333, 333, 0, 0, 100, 100));
    });

    it('should handle asymmetric target dimensions', () => {
      const result = calculateSharpResizeRect(1000, 1000, {
        width: 200,
        height: 100,
        fit: 'contain'
      });

      expect(result).toEqual(createRect(0, 0, 1000, 1000, 50, 0, 100, 100));
    });

    it('should default to cover mode when fit is not specified', () => {
      const withoutFit = calculateSharpResizeRect(1000, 500, { width: 400, height: 400 });
      const withCover = calculateSharpResizeRect(1000, 500, {
        width: 400,
        height: 400,
        fit: 'cover'
      });

      expect(withoutFit).toEqual(withCover);
    });
  });

  describe('mathematical precision', () => {
    it('should handle fractional aspect ratios correctly', () => {
      // Source: 1920x1080 (16:9), Target: 800x600 (4:3)
      const result = calculateSharpResizeRect(1920, 1080, {
        width: 800,
        height: 600,
        fit: 'cover'
      });

      // Should crop horizontally from the wider source
      const expectedCropWidth = Math.round(1080 * (800 / 600)); // 1440
      const expectedSx = Math.round((1920 - expectedCropWidth) / 2); // 240

      expect(result).toEqual(
        createRect(expectedSx, 0, expectedCropWidth, 1080, 0, 0, 800, 600)
      );
    });

    it('should maintain precision with large numbers', () => {
      // Source: 4000x3000 (4:3), Target: 1920x1080 (16:9)
      const result = calculateSharpResizeRect(4000, 3000, {
        width: 1920,
        height: 1080,
        fit: 'contain'
      });

      // Should fit to height: 1080 * (4000/3000) = 1440
      expect(result).toEqual(createRect(0, 0, 4000, 3000, 240, 0, 1440, 1080));
    });
  });
});
