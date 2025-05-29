let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = async (event) => {
  const { id, data } = event.data;

  try {
    const blob = new Blob([data]);
    const imageBitmap = await createImageBitmap(blob);

    if (
      !canvas ||
      canvas.width !== imageBitmap.width ||
      canvas.height !== imageBitmap.height
    ) {
      canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      ctx = canvas.getContext('2d');
    }

    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    ctx!.drawImage(imageBitmap, 0, 0);

    const { data: pixelData } = ctx!.getImageData(0, 0, canvas.width, canvas.height);

    self.postMessage(
      {
        id,
        width: canvas.width,
        height: canvas.height,
        buffer: pixelData.buffer
      },
      [pixelData.buffer]
    );
  } catch (err) {
    self.postMessage({ id, error: (err as Error).message });
  }
};
