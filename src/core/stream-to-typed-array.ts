export async function streamToUint8Array(
  stream: ReadableStream<Uint8Array> | null,
  onProgress?: (bytesLoaded: number) => void
): Promise<Uint8Array> {
  if (stream == null) {
    throw new Error(`Stream is null or undefined. Please provide a valid ReadableStream.`);
  }

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  let read = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value.byteLength === 0) continue;

      chunks.push(value);
      totalLength += value.byteLength;

      if (onProgress && totalLength !== read) {
        onProgress(totalLength);
        read = totalLength;
      }
    }
  } finally {
    reader.releaseLock();
  }

  switch (chunks.length) {
    case 0:
      return new Uint8Array(0);
    case 1:
      return chunks[0] as Uint8Array;
    default:
      return mergeChunks(chunks, totalLength);
  }
}

function mergeChunks(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
}
