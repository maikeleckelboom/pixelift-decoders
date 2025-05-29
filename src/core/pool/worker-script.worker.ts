import type {
  WorkerErrorResponse,
  WorkerRequest,
  WorkerSuccessResponse
} from '@/core/pool/worker-types';
import { calculateDrawRectSharpLike } from '@/core/utils/canvas.ts';

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, data, task, resize } = event.data;

  if (task !== 'process') return;

  try {
    canvas ??= new OffscreenCanvas(1, 1);
    ctx ??= canvas.getContext('2d');

    if (!ctx) return returnError(id, 'Failed to get 2D context');

    const blob = new Blob([data]);
    console.log(`Worker processing image with size: ${data.byteLength} bytes`);
    const imageBitmap = await createImageBitmap(blob);

    const targetWidth = resize?.width ?? imageBitmap.width;
    const targetHeight = resize?.height ?? imageBitmap.height;

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.clearRect(0, 0, targetWidth, targetHeight);

    const { sx, sy, sw, sh, dx, dy, dw, dh } = calculateDrawRectSharpLike(
      imageBitmap.width,
      imageBitmap.height,
      {
        width: targetWidth,
        height: targetHeight,
        fit: resize?.fit
      }
    );

    ctx.drawImage(imageBitmap, sx, sy, sw, sh, dx, dy, dw, dh);

    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

    const response: WorkerSuccessResponse = {
      id,
      task: 'process',
      width: targetWidth,
      height: targetHeight,
      result: imageData.data
    };

    self.postMessage(response, [imageData.data.buffer]);
  } catch (err) {
    returnError(id, err);
  }
};

function returnError(id: string | number, error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error';
  const response: WorkerErrorResponse = { id, error: message, task: 'error' };
  self.postMessage(response);
}
