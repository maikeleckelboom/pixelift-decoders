import { listBrowserSupportedExtensions } from '@test/fixtures/assets';
import { decode } from '@/core/decode/decode';
import { beforeAll, describe, expect, it } from 'vitest';

const ASSET_LOADING_TIMEOUT = 30000;
const DECODE_TEST_TIMEOUT = 10000;

interface TestAsset {
  url: string;
  name: string;
  blob: Blob;
  ext: string;
}

describe('decode in browser environment', () => {
  const extensions = listBrowserSupportedExtensions();
  let assets: TestAsset[] = [];

  beforeAll(async () => {
    if (extensions.length === 0) {
      console.warn('[decode.test] No supported extensions found. Skipping asset loading.');
      return;
    }

    const loadAsset = async (ext: string): Promise<TestAsset | null> => {
      const url = new URL(`../fixtures/assets/pixelift.${ext}`, import.meta.url);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        return {
          url: url.href,
          name: `pixelift.${ext}`,
          blob: await response.blob(),
          ext
        };
      } catch (err) {
        console.error(`[decode.test] Failed to load ${url.href}:`, err);
        return null;
      }
    };

    const results = await Promise.all(extensions.map(loadAsset));
    assets = results.filter((asset): asset is TestAsset => asset !== null);
  }, ASSET_LOADING_TIMEOUT);

  it('should load at least one supported asset', () => {
    if (extensions.length === 0) {
      console.warn('[decode.test] Skipping asset check — no extensions found');
      return;
    }
    expect(assets.length).toBeGreaterThan(0);
  });

  describe(
    'canvas-based decoding',
    () => {
      for (const ext of extensions) {
        it(
          `decodes pixelift.${ext} using canvas`,
          async () => {
            const { blob } = assets.find((a) => a.ext === ext) as TestAsset;

            const pixelData = await decode(blob, {
              preferWorker: true,
              resize: {
                width: 50,
                height: 50
              }
            });

            console.log(
              `We got 'em! ${pixelData.width}x${pixelData.height} @ ${pixelData.data.length} bytes 🔒`
            );

            const { data, width, height } = pixelData;

            expect(width).toBe(50);
            expect(height).toBe(50);
            expect(data).toBeInstanceOf(Uint8ClampedArray);
            expect(data.length).toBe(width * height * 4);
          },
          DECODE_TEST_TIMEOUT
        );
      }
    },
    ASSET_LOADING_TIMEOUT
  );
});
