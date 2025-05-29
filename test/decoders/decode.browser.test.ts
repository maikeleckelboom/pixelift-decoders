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

  for (const asset of assets) {
    it(
      `decodes ${asset.name} (${asset.ext})`,
      async () => {
        const { data, width, height } = await decode(asset.blob, {
          resize: { width: 100, height: 100 }
        });

        expect(width).toBe(100);
        expect(height).toBe(100);
        expect(data).toBeInstanceOf(Uint8ClampedArray);
        expect(data.length).toBe(4);
      },
      DECODE_TEST_TIMEOUT
    );
  }

  if (assets.length === 0) {
    console.warn('[decode.test] No assets were loaded — skipping decode tests.');
  }
});
