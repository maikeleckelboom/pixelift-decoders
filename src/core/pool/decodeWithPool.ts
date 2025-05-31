import { OffscreenCanvasPool } from '@/core/pool/OffscreenCanvasPool.ts';

const pool = new OffscreenCanvasPool(800, 600, 3);

async function drawImageWithPooling(imageBitmap: ImageBitmap) {
  const canvas = await pool.acquire();
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      data: imageData.data,
      width: canvas.width,
      height: canvas.height
    };
  } finally {
    pool.release(canvas);
  }
}
