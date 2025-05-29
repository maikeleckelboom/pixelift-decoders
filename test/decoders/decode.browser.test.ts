import { listBrowserSupportedExtensions } from '@test/fixtures/assets';
import { decode } from '@/core/decode/decode';
import { describe, it, expect, beforeAll } from 'vitest';

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

  describe('decoding assets (worker vs non-worker)', () => {
    for (const preferWorker of [true, false]) {
      const label = preferWorker ? 'worker' : 'canvas';

      describe(`using ${label}`, () => {
        for (const ext of extensions) {
          it(
            `decodes pixelift.${ext}`,
            async () => {
              const asset = assets.find((a) => a.ext === ext);
              expect(asset).toBeDefined();

              const { data, width, height } = await decode(asset!.blob, {
                preferWorker
              });

              expect(width).toBe(100);
              expect(height).toBe(100);
              expect(data).toBeInstanceOf(Uint8ClampedArray);
              expect(data.length).toBe(width * height * 4);
            },
            DECODE_TEST_TIMEOUT
          );
        }
      });
    }
  });
});
