import type { SharpInput, SharpOptions } from 'sharp';
import type { PixelData } from '@/decoders/sharp/types';
import { importSharp, type Sharp } from '@/decoders/sharp/sharp-loader';

export class DecodeError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'DecodeError';
  }
}

// --- Adapter Strategy Interface (generic input-aware)
interface InputAdapterStrategy<
  T extends SharpInput | ReadableStream | Blob = SharpInput | ReadableStream | Blob
> {
  canHandle(input: unknown): input is T;

  adapt(input: T, sharp: Sharp): Promise<ReturnType<Sharp>>;
}

// --- Web Stream → Uint8Array helper
async function bufferFromWebStream(
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  } finally {
    reader.releaseLock();
  }
}

// --- Adapters (browser-safe)
const uint8Adapter: InputAdapterStrategy<Uint8Array> = {
  canHandle: (input): input is Uint8Array => input instanceof Uint8Array,
  adapt: async (input, sharp) => sharp(input)
};

const blobAdapter: InputAdapterStrategy<Blob> = {
  canHandle: (input): input is Blob => input instanceof Blob,
  adapt: async (input, sharp) => {
    const arrayBuffer = await input.arrayBuffer();
    return sharp(new Uint8Array(arrayBuffer));
  }
};

const webStreamAdapter: InputAdapterStrategy<ReadableStream<Uint8Array>> = {
  canHandle: (input): input is ReadableStream<Uint8Array> =>
    typeof ReadableStream !== 'undefined' && input instanceof ReadableStream,
  adapt: async (input, sharp) => {
    const buffer = await bufferFromWebStream(input);
    return sharp(buffer);
  }
};

const urlAdapter: InputAdapterStrategy<string> = {
  canHandle: (input): input is string => typeof input === 'string',
  adapt: async (input, sharp) => sharp(input) // assumes it's a browser-safe URL or base64
};

// --- Adapter registry
const inputAdapters: InputAdapterStrategy[] = [
  uint8Adapter,
  blobAdapter,
  webStreamAdapter,
  urlAdapter
];

function getAdapter(input: SharpInput | ReadableStream | Blob): InputAdapterStrategy {
  const adapter = inputAdapters.find((a) => a.canHandle(input));
  if (!adapter) {
    throw new DecodeError(`Unsupported input type: ${typeof input}`);
  }
  return adapter;
}

// --- Validation
function validatePixelData(data: Uint8Array, width: number, height: number): void {
  if (!width || !height) {
    throw new DecodeError('Missing image dimensions');
  }
  const expected = width * height * 4;
  if (data.byteLength !== expected) {
    throw new DecodeError(`Expected ${expected} bytes, got ${data.byteLength}`);
  }
}

// --- Pipeline builder
function buildPipeline(src: ReturnType<Sharp>, _opts?: SharpOptions): ReturnType<Sharp> {
  return src.ensureAlpha().raw();
}

// --- Pixel extraction
async function extractPixelData(pipeline: ReturnType<Sharp>): Promise<PixelData> {
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  validatePixelData(data, info.width, info.height);

  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height
  };
}

export type SharpDecoderInput = SharpInput | ReadableStream | Blob;

// --- Public API
export async function decode(
  input: SharpDecoderInput,
  options?: SharpOptions
): Promise<PixelData> {
  const sharp = await importSharp();
  const adapter = getAdapter(input);

  try {
    const source = await adapter.adapt(input as never, sharp); // safe due to canHandle
    const pipeline = buildPipeline(source, options);
    return await extractPixelData(pipeline);
  } catch (err) {
    throw err instanceof DecodeError
      ? err
      : new DecodeError('Decode pipeline failure', err);
  }
}
