import { decodeWithCanvas } from '@/decoders/canvas/decodeWithCanvas.ts';
import { type BlobLoader, testImages } from '@test/fixtures/assets.ts';

describe('decodeWithCanvas', () => {
  test.each(Object.entries(testImages))(
    '%s image decodes correctly',
    async (key, loadBlob) => {
      const blob = await loadBlob();
      const pixelData = await decodeWithCanvas(blob);

      expect(pixelData.width).toBeGreaterThan(0);
      expect(pixelData.height).toBeGreaterThan(0);
      expect(pixelData.data.length).toBe(pixelData.width * pixelData.height * 4);
    }
  );

  test('decodes with resizing across formats', async () => {
    const resize = { width: 20, height: 20, fit: 'cover' as const };

    for (const loadBlob of Object.values(testImages)) {
      const blob = await loadBlob();
      const pixelData = await decodeWithCanvas(blob, { resize });

      expect(pixelData.width).toBe(resize.width);
      expect(pixelData.height).toBe(resize.height);
      expect(pixelData.data.length).toBe(resize.width * resize.height * 4);
    }
  });

  test('stress test: decodes many images concurrently', async () => {
    const resize = { width: 32, height: 32, fit: 'cover' as const };
    const concurrency = 50;
    const imageLoaders = Object.values(testImages);
    const blobs: Blob[] = [];

    for (let i = 0; i < concurrency; i++) {
      const loader = imageLoaders[i % imageLoaders.length] as () => Promise<Blob>;
      blobs.push(await loader());
    }

    const tasks = blobs.map((blob) => decodeWithCanvas(blob, { resize }));
    const results = await Promise.all(tasks);

    for (const pixelData of results) {
      expect(pixelData.width).toBe(resize.width);
      expect(pixelData.height).toBe(resize.height);
      expect(pixelData.data.length).toBe(resize.width * resize.height * 4);
    }
  });

  test('stress test: concurrent decodes with frequent resizing', async () => {
    const concurrency = 50;
    const imageLoaders = Object.values(testImages);
    const blobs: Blob[] = [];

    for (let i = 0; i < concurrency; i++) {
      const loader = imageLoaders[i % imageLoaders.length] as BlobLoader;
      blobs.push(await loader());
    }

    // Random resize sizes to vary workload, mostly forcing resize
    const resizeOptions = [
      { width: 16, height: 16, fit: 'cover' as const },
      { width: 32, height: 24, fit: 'contain' as const },
      { width: 48, height: 48, fit: 'fill' as const },
      { width: 64, height: 32, fit: 'cover' as const }
    ];

    const tasks = blobs.map((blob, i) => {
      const resize = i % 10 === 0 ? undefined : resizeOptions[i % resizeOptions.length];
      return decodeWithCanvas(blob, resize ? { resize } : undefined);
    });

    const results = await Promise.all(tasks);

    results.forEach((pixelData, i) => {
      if (i % 10 === 0) {
        expect(pixelData.width).toBeGreaterThan(0);
        expect(pixelData.height).toBeGreaterThan(0);
        expect(pixelData.data.length).toBe(pixelData.width * pixelData.height * 4);
      } else {
        // Resize was applied, verify dimensions
        const expectedResize = resizeOptions[i % resizeOptions.length];
        expect(pixelData.width).toBe(expectedResize?.width);
        expect(pixelData.height).toBe(expectedResize?.height);
        expect(pixelData.data.length).toBe(
          expectedResize!.width * expectedResize!.height * 4
        );
      }
    });
  });
});
