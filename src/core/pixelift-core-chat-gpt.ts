// pixel-data.ts
import { streamToUint8Array } from '@/core/stream-to-typed-array.ts';
import { isBufferSource, isValidUrl } from '@/core/validate.ts';
import { createPool } from '@/core/concurrency/create-pool.ts';

export type PixelData = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type ImageInput = string | ReadableStream | Uint8Array | ArrayBuffer | Buffer | Blob;

const MAX_CONCURRENT = 5;
const cache = new Map<string, PixelData>();

function isNode() {
  return typeof process !== 'undefined' && !!process.versions?.node;
}

function getCacheKey(input: ImageInput, width: number, height: number): string {
  const baseKey =
    typeof input === 'string'
      ? input
      : input instanceof Blob
        ? input.type
        : input instanceof Uint8Array
          ? `buffer_${input.byteLength}_${input[0]}`
          : 'unknown';

  return `${baseKey}_${width}x${height}`;
}

// --- Shared canvas pool (browser only) ---
const sharedCanvasPool =
  typeof OffscreenCanvas !== 'undefined'
    ? createPool(Array.from({ length: MAX_CONCURRENT }, () => new OffscreenCanvas(1, 1)))
    : null;

async function decodeBrowser(
  input: ImageInput,
  width: number,
  height: number
): Promise<PixelData> {
  let bitmap: ImageBitmap;
  if (typeof input === 'string' && isValidUrl(input)) {
    const res = await fetch(input);
    const blob = await res.blob();
    bitmap = await createImageBitmap(blob);
  } else if (input instanceof Blob) {
    bitmap = await createImageBitmap(input);
  } else if (isBufferSource(input)) {
    const blob = new Blob([input]);
    bitmap = await createImageBitmap(blob);
  } else if (input instanceof ArrayBuffer) {
    const blob = new Blob([input]);
    bitmap = await createImageBitmap(blob);
  } else if (input instanceof ReadableStream) {
    const combined = await streamToUint8Array(input);
    const blob = new Blob([combined]);
    bitmap = await createImageBitmap(blob);
  } else {
    throw new Error('Unsupported input type');
  }

  if (!sharedCanvasPool) throw new Error('OffscreenCanvas not supported');

  const canvas = await sharedCanvasPool.acquire();
  try {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const imageData = ctx.getImageData(0, 0, width, height);
    return {
      width,
      height,
      data: imageData.data
    };
  } finally {
    sharedCanvasPool.release(canvas);
  }
}

async function normalizeServerSide(input: ImageInput): Promise<Uint8Array | ArrayBuffer> {
  return typeof input === 'string' && isValidUrl(input)
    ? await fetch(input).then((res) => res.arrayBuffer())
    : isBufferSource(input)
      ? input instanceof ArrayBuffer
        ? input
        : (input.buffer.slice(
            input.byteOffset,
            input.byteOffset + input.byteLength
          ) as ArrayBuffer)
      : input instanceof Blob
        ? await input.arrayBuffer()
        : input instanceof ReadableStream
          ? await streamToUint8Array(input)
          : new Uint8Array(input);
}

// --- Concurrency wrapper ---
const decodeQueue: (() => void)[] = [];
let activeDecodes = 0;

async function runWithConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  if (activeDecodes >= MAX_CONCURRENT) {
    return new Promise<T>((resolve, reject) => {
      decodeQueue.push(() => {
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            activeDecodes--;
            const next = decodeQueue.shift();
            if (next) next();
          });
      });
    });
  }

  activeDecodes++;
  try {
    return await fn();
  } finally {
    activeDecodes--;
    const next = decodeQueue.shift();
    if (next) next();
  }
}

// --- Public API ---
export async function getPixelData(
  input: ImageInput,
  width: number,
  height: number
): Promise<PixelData> {
  if (width <= 0 || height <= 0) throw new Error('Invalid width/height');

  const key = getCacheKey(input, width, height);
  if (cache.has(key)) return cache.get(key)!;

  const run = async () => {
    const buffer = await normalizeServerSide(input);
    const pixelData = isNode()
      ? await decodeNode(buffer as Uint8Array, width, height)
      : await decodeBrowser(buffer, width, height);
    cache.set(key, pixelData);
    return pixelData;
  };

  return runWithConcurrency(run);
}

// --- Node decoder ---
async function decodeNode(
  buffer: Uint8Array,
  width: number,
  height: number
): Promise<PixelData> {
  const sharp = await import('sharp');
  const image = sharp.default(buffer);
  const meta = await image.metadata();
  if (!meta.width || !meta.height) throw new Error('No metadata');
  const raw = await image.resize(width, height).raw().toBuffer();
  return {
    width,
    height,
    data: new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength)
  };
}
