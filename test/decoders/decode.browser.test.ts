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

describe('Image Decoding in Browser', () => {
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

  it('should have at least one supported image format available for decoding', () => {
    if (extensions.length === 0) {
      console.warn('[decode.test] Skipping asset check — no extensions found');
      return;
    }
    expect(assets.length).toBeGreaterThan(0);
  });

  extensions.forEach((ext) => {
    const FORMAT = ext.toUpperCase();

    describe(`${FORMAT} Decoding`, () => {
      it(
        `should decode ${FORMAT} image successfully using worker thread`,
        async () => {
          const asset = assets.find((a) => a.ext === ext);
          if (!asset) {
            console.warn(`[decode.test] No asset found for ${ext}. Skipping test.`);
            return;
          }

          const pixelData = await decode(asset.blob, {
            preferWorker: true,
            resize: {
              width: 50,
              height: 50
            }
          });

          const { data, width, height } = pixelData;

          expect(width).toBe(50);
          expect(height).toBe(50);
          expect(data).toBeInstanceOf(Uint8ClampedArray);
          expect(data.length).toBe(width * height * 4);
        },
        DECODE_TEST_TIMEOUT
      );

      it(
        `should decode ${FORMAT} image successfully using main thread`,
        async () => {
          const asset = assets.find((a) => a.ext === ext);
          if (!asset) {
            console.warn(`[decode.test] No asset found for ${ext}. Skipping test.`);
            return;
          }

          const pixelData = await decode(asset.blob, {
            preferWorker: false,
            resize: {
              width: 50,
              height: 50
            }
          });

          const { data, width, height } = pixelData;

          expect(width).toBe(50);
          expect(height).toBe(50);
          expect(data).toBeInstanceOf(Uint8ClampedArray);
          expect(data.length).toBe(width * height * 4);
        },
        DECODE_TEST_TIMEOUT
      );
    });
  });
});
