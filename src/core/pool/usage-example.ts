import { withCanvas } from '@/core/pool/canvas-pool';
import { withWorker } from '@/core/pool/worker-pool';

export async function exampleUsage() {
  const result = await withCanvas(async (canvas) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    return canvas;
  });

  console.log('Canvas operation completed:', result);

  const workerResult = await withWorker(async (worker) => {
    worker.onmessage = (event) => event.data.result;
    worker.postMessage({ task: 'process', data: new Uint8Array([1, 2, 3, 4]) });
  });

  console.log('Worker operation completed:', workerResult);
}
