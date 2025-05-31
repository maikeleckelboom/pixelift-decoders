import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { decodeWithCanvas } from '@/decoders/canvas/decodeWithCanvas.ts';

const MOCK_WIDTH = 100;
const MOCK_HEIGHT = 50;

let mockBitmap: ImageBitmap;

beforeEach(() => {
  mockBitmap = {
    width: MOCK_WIDTH,
    height: MOCK_HEIGHT,
    close: vi.fn()
  } as unknown as ImageBitmap;

  globalThis.createImageBitmap = vi.fn().mockResolvedValue(mockBitmap);

  vi.spyOn(OffscreenCanvas.prototype, 'getContext').mockImplementation(() => {
    return {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: () => ({
        data: new Uint8ClampedArray(MOCK_WIDTH * MOCK_HEIGHT * 4),
        width: MOCK_WIDTH,
        height: MOCK_HEIGHT
      }),
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    } as unknown as OffscreenCanvasRenderingContext2D;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('decodeWithCanvas', () => {
  test('decodes image without resizing', async () => {
    const blob = new Blob([new Uint8Array([0])], { type: 'image/png' });

    const pixelData = await decodeWithCanvas(blob);

    expect(globalThis.createImageBitmap).toHaveBeenCalledWith(blob);
    expect(pixelData.width).toBe(MOCK_WIDTH);
    expect(pixelData.height).toBe(MOCK_HEIGHT);
    expect(pixelData.data.length).toBe(MOCK_WIDTH * MOCK_HEIGHT * 4);
    expect(mockBitmap.close).toHaveBeenCalled();
  });

  test('decodes and resizes image correctly', async () => {
    const blob = new Blob([new Uint8Array([0])], { type: 'image/png' });

    vi.spyOn(OffscreenCanvas.prototype, 'getContext').mockImplementation(() => {
      return {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: () => ({
          data: new Uint8ClampedArray(50 * 25 * 4),
          width: 50,
          height: 25
        }),
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      } as unknown as OffscreenCanvasRenderingContext2D;
    });

    const resize = { width: 50, height: 25, fit: 'cover' } as const;
    const pixelData = await decodeWithCanvas(blob, { resize });

    expect(pixelData.width).toBe(resize.width);
    expect(pixelData.height).toBe(resize.height);
    expect(pixelData.data.length).toBe(resize.width * resize.height * 4);
    expect(mockBitmap.close).toHaveBeenCalled();
  });

  test('throws if canvas 2d context is not available', async () => {
    const originalGetContext = OffscreenCanvas.prototype.getContext;
    OffscreenCanvas.prototype.getContext = () => null;

    const blob = new Blob([new Uint8Array([0])], { type: 'image/png' });

    await expect(decodeWithCanvas(blob)).rejects.toThrow('Canvas 2D context not available');

    OffscreenCanvas.prototype.getContext = originalGetContext;
  });

  test('properly cleans up resources on error', async () => {
    globalThis.createImageBitmap = vi.fn().mockRejectedValue(new Error('Invalid source'));

    await expect(decodeWithCanvas({} as any)).rejects.toThrow('Invalid source');
  });
});
