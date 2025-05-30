import { decode } from '@/core/decode/decode';
import { listBrowserSupportedExtensions } from '@test/fixtures/assets';
import { bench, beforeAll, describe } from 'vitest';

const ASSET_LOADING_TIMEOUT = 30000;
const BENCHMARK_DURATION = 1000;
const BENCHMARK_WARMUP = 300;

interface TestAsset {
  url: string;
  name: string;
  blob: Blob;
  ext: string;
}

const assets = new Map<string, TestAsset>();
const extensions = listBrowserSupportedExtensions();

// Eagerly register all benches
describe('Pixelift Decode Performance (Browser)', () => {
  for (const preferWorker of [true, false] as const) {
    const label = preferWorker ? 'worker' : 'main-thread';

    for (const ext of extensions) {
      const FORMAT = ext.toUpperCase();

      bench(
        `${FORMAT} (${label})`,
        () => {
          const asset = assets.get(ext)!;

          decode(asset.blob, {
            preferWorker
          });
        },
        {
          time: BENCHMARK_DURATION,
          warmupTime: BENCHMARK_WARMUP,
          iterations: 100
        }
      );
    }
  }
});

// Load assets before benchmark runs
beforeAll(async () => {
  const loadAsset = async (ext: string): Promise<void> => {
    const url = new URL(`../fixtures/assets/pixelift.${ext}`, import.meta.url);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      const blob = await response.blob();
      assets.set(ext, {
        url: url.href,
        name: `pixelift.${ext}`,
        blob,
        ext
      });
    } catch (err) {
      console.error(`[decode.bench] Failed to load ${url.href}:`, err);
    }
  };

  await Promise.all(extensions.map(loadAsset));
}, ASSET_LOADING_TIMEOUT);
