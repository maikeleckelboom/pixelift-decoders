import { bench } from 'vitest';
import { decodeWithCanvas } from '@/decoders/canvas/decodeWithCanvas';

let imageBlob: Blob;

async function prepareBlob() {
  const canvas = new OffscreenCanvas(128, 128);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  imageBlob = await canvas.convertToBlob();
}

await prepareBlob();

bench(
  'decode 128x128 image with canvas',
  async () => {
    await decodeWithCanvas(imageBlob);
  },
  {
    time: 5_000
  }
);

bench(
  'decode 128x128 image with canvas and resize to 64x64',
  async () => {
    await decodeWithCanvas(imageBlob, { resize: { width: 64, height: 64 } });
  },
  {
    time: 5_000
  }
);

bench(
  'decode 128x128 image with canvas and resize to 16x16',
  async () => {
    await decodeWithCanvas(imageBlob, { resize: { width: 16, height: 16 } });
  },
  {
    time: 5_000
  }
);
