import type {
  WorkerErrorResponse,
  WorkerRequest,
  WorkerSuccessResponse
} from '@/core/pool/worker-types';

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, data, task } = event.data;
  if (task !== 'process') return;

  try {
    canvas ??= new OffscreenCanvas(1, 1);
    ctx ??= canvas.getContext('2d');

    if (!ctx) {
      return returnError(id, 'Failed to get 2D context');
    }

    const blob = new Blob([data]);
    const imageBitmap = await createImageBitmap(blob);

    if (canvas.width !== imageBitmap.width || canvas.height !== imageBitmap.height) {
      canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      ctx = canvas.getContext('2d');

      if (!ctx) {
        return returnError(id, 'Failed to get 2D context after resizing');
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageBitmap, 0, 0);
    const { data: pixelData } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const response: WorkerSuccessResponse = {
      id,
      task: 'process',
      width: canvas.width,
      height: canvas.height,
      result: pixelData
    };

    self.postMessage(response, [pixelData.buffer]);
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
  const response: WorkerErrorResponse = { id, error: message };
  self.postMessage(response);
}
