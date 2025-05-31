import { decodeWithCanvas } from '@/decoders/canvas/decodeWithCanvas.ts';
import { testImages } from '@test/fixtures/assets.ts';
import { bench } from 'vitest';

const resizeOptions = [
  { width: 16, height: 16, fit: 'cover' as const },
  { width: 32, height: 24, fit: 'contain' as const },
  { width: 48, height: 48, fit: 'fill' as const },
  { width: 64, height: 32, fit: 'cover' as const }
];

async function prepareBlobs(concurrency: number) {
  const keys = Object.keys(testImages);
  return Promise.all(
    Array.from({ length: concurrency }, () => {
      const key = keys[Math.floor(Math.random() * keys.length)]!;
      return testImages[key]!();
    })
  );
}

async function runConcurrentDecode(concurrency: number) {
  const blobs = await prepareBlobs(concurrency);

  return Promise.all(
    blobs.map((blob, i) => {
      const resize = i % 5 === 0 ? undefined : resizeOptions[i % resizeOptions.length];
      return decodeWithCanvas(blob, resize ? { resize } : undefined);
    })
  );
}

await runConcurrentDecode(20);

bench('single decode (no resize)', async () => {
  const blobs = await prepareBlobs(1);
  await decodeWithCanvas(blobs[0]!);
});

bench('single decode with resize', async () => {
  const blobs = await prepareBlobs(1);
  await decodeWithCanvas(blobs[0]!, { resize: resizeOptions[0]! });
});

bench('concurrent decode 20 with frequent resizing', async () => {
  await runConcurrentDecode(20);
});

bench('concurrent decode 50 with frequent resizing', async () => {
  await runConcurrentDecode(50);
});

bench('concurrent decode 100 with frequent resizing', async () => {
  await runConcurrentDecode(100);
});
