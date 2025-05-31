import { decodeWithCanvas } from '@/decoders/canvas/decodeWithCanvas.ts';

function createMinimalPngBlob(): Blob {
  // This is a minimal 1x1 transparent PNG (67 bytes)
  const pngData = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
    0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00,
    0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78,
    0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);

  return new Blob([pngData], { type: 'image/png' });
}

function createAlternatePngBlob(): Blob {
  return createMinimalPngBlob();
}

function createDataUrlBlob(
  width: number,
  height: number,
  color: string = '#FF0000'
): Promise<Blob> {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color}"/>
  </svg>`;

  const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
  return fetch(dataUrl).then((r) => r.blob());
}

function getTestBlob(): Blob {
  return createMinimalPngBlob();
}

describe('decodeWithCanvas', () => {
  test('decodes minimal PNG without resizing', async () => {
    const blob = createMinimalPngBlob();
    const pixelData = await decodeWithCanvas(blob);

    expect(pixelData.width).toBe(1);
    expect(pixelData.height).toBe(1);
    expect(pixelData.data.length).toBe(4); // 1x1 * 4 channels
    expect(pixelData.data).toBeInstanceOf(Uint8ClampedArray);
  });

  test('decodes and resizes image correctly', async () => {
    const blob = createMinimalPngBlob();
    const resize = { width: 10, height: 5, fit: 'cover' as const };

    const pixelData = await decodeWithCanvas(blob, { resize });

    expect(pixelData.width).toBe(resize.width);
    expect(pixelData.height).toBe(resize.height);
    expect(pixelData.data.length).toBe(resize.width * resize.height * 4);
  });

  test('decodes image and can be resized', async () => {
    const blob = getTestBlob();

    // Test with larger resize to verify scaling works
    const resize = { width: 10, height: 8, fit: 'cover' as const };
    const pixelData = await decodeWithCanvas(blob, { resize });

    expect(pixelData.width).toBe(resize.width);
    expect(pixelData.height).toBe(resize.height);
    expect(pixelData.data.length).toBe(resize.width * resize.height * 4);
  });

  test('handles different resize operations', async () => {
    const testCases = [
      { blob: getTestBlob(), resize: { width: 5, height: 5, fit: 'cover' as const } },
      { blob: getTestBlob(), resize: { width: 3, height: 7, fit: 'contain' as const } },
      {
        blob: createAlternatePngBlob(),
        resize: { width: 2, height: 2, fit: 'fill' as const }
      }
    ];

    for (const testCase of testCases) {
      const pixelData = await decodeWithCanvas(testCase.blob, { resize: testCase.resize });

      expect(pixelData.width).toBe(testCase.resize.width);
      expect(pixelData.height).toBe(testCase.resize.height);
      expect(pixelData.data.length).toBe(
        testCase.resize.width * testCase.resize.height * 4
      );
    }
  });

  test('throws if canvas 2d context is not available', async () => {
    // Save original method
    const originalGetContext = OffscreenCanvas.prototype.getContext;

    // Mock to return null
    OffscreenCanvas.prototype.getContext = vi.fn().mockReturnValue(null);

    const blob = createMinimalPngBlob();

    await expect(decodeWithCanvas(blob)).rejects.toThrow('Canvas 2D context not available');

    // Restore original method
    OffscreenCanvas.prototype.getContext = originalGetContext;
  });

  test('handles invalid blob gracefully', async () => {
    const invalidBlob = new Blob(['not an image'], { type: 'image/png' });

    await expect(decodeWithCanvas(invalidBlob)).rejects.toThrow();
  });

  test('processes multiple images concurrently', async () => {
    const blobs = [
      getTestBlob(),
      createAlternatePngBlob(),
      getTestBlob(),
      createAlternatePngBlob(),
      getTestBlob(),
      createAlternatePngBlob(),
      getTestBlob(),
      createAlternatePngBlob(),
      getTestBlob(),
      createAlternatePngBlob(),
      getTestBlob(),
      createAlternatePngBlob(),
      getTestBlob(),
      createAlternatePngBlob(),
      getTestBlob(),
      createAlternatePngBlob()
    ];

    const tasks = blobs.map((blob) => decodeWithCanvas(blob));
    const results = await Promise.all(tasks);

    expect(results).toHaveLength(16);

    // Verify each result has valid dimensions and data
    results.forEach((pixelData) => {
      expect(pixelData.width).toBeGreaterThan(0);
      expect(pixelData.height).toBeGreaterThan(0);
      expect(pixelData.data.length).toBe(pixelData.width * pixelData.height * 4);
      expect(pixelData.data).toBeInstanceOf(Uint8ClampedArray);
    });
  });

  test('maintains data integrity across different operations', async () => {
    const blob = getTestBlob();

    // Test without resize
    const originalPixelData = await decodeWithCanvas(blob);

    // Test with resize
    const resizedPixelData = await decodeWithCanvas(blob, {
      resize: { width: 4, height: 4, fit: 'cover' }
    });

    // Both should be valid
    expect(originalPixelData.data).toBeInstanceOf(Uint8ClampedArray);
    expect(resizedPixelData.data).toBeInstanceOf(Uint8ClampedArray);

    expect(originalPixelData.width).toBe(1);
    expect(originalPixelData.height).toBe(1);
    expect(resizedPixelData.width).toBe(4);
    expect(resizedPixelData.height).toBe(4);
  });

  test('handles resize with different parameters', async () => {
    const blob = getTestBlob();

    const resizeConfigs = [
      { width: 1, height: 1, fit: 'cover' as const },
      { width: 5, height: 3, fit: 'contain' as const },
      { width: 10, height: 10, fit: 'fill' as const }
    ];

    for (const resize of resizeConfigs) {
      const pixelData = await decodeWithCanvas(blob, { resize });

      expect(pixelData.width).toBe(resize.width);
      expect(pixelData.height).toBe(resize.height);
      expect(pixelData.data.length).toBe(resize.width * resize.height * 4);
    }
  });

  test('validates pixel data structure', async () => {
    const blob = createMinimalPngBlob();
    const pixelData = await decodeWithCanvas(blob);

    // Check ImageData structure
    expect(pixelData).toHaveProperty('width');
    expect(pixelData).toHaveProperty('height');
    expect(pixelData).toHaveProperty('data');

    // Check data array properties
    expect(pixelData.data).toBeInstanceOf(Uint8ClampedArray);
    expect(pixelData.data.length % 4).toBe(0); // Should be multiple of 4 (RGBA)

    // Each pixel should have exactly 4 values
    const expectedPixels = pixelData.width * pixelData.height;
    expect(pixelData.data.length).toBe(expectedPixels * 4);
  });
});
