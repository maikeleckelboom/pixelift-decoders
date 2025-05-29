import {
  PixeliftBufferOverflowError,
  PixeliftFetchAbortedError,
  PixeliftHttpError
} from '@/core/error.ts';
import { throwIfAborted } from '@/core/abort.ts';
import { isValidUrl } from '@/core/validate.ts';

export interface ProgressInfo {
  loaded: number;
  total: number;
  percent: number | null;
}

export interface FetchWithControlsOptions {
  onProgress?: (info: ProgressInfo) => void;
  progressInterval?: number;
  maxBufferSize?: number;
  request?: RequestInit;
}

const DEFAULT_HEADERS: HeadersInit = {
  Accept: '*/*'
};

const DEFAULT_FETCH_OPTIONS: Omit<RequestInit, 'headers' | 'signal' | 'body' | 'method'> =
  {};
const DEFAULT_PROGRESS_INTERVAL = 100;
const DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024;

async function fetchWithErrorHandling(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);
  if (!response.ok) throw new PixeliftHttpError(response);
  return response;
}

async function manageProgressProcessing(
  progressStreamReader: ReadableStreamDefaultReader<Uint8Array>,
  totalBytes: number,
  signal: AbortSignal,
  onProgress: (info: ProgressInfo) => void,
  controller: ReadableStreamDefaultController<Uint8Array>,
  progressInterval: number
): Promise<void> {
  let loadedBytes = 0;
  let lastUpdate = 0;

  try {
    while (true) {
      throwIfAborted(signal);
      const { done, value } = await progressStreamReader.read();

      if (done) {
        handleFinalProgress(totalBytes, loadedBytes, onProgress);
        break;
      }

      loadedBytes += value.byteLength;
      const now = Date.now();

      if (now - lastUpdate >= progressInterval || loadedBytes === totalBytes) {
        reportProgress(loadedBytes, totalBytes, onProgress);
        lastUpdate = now;
      }
    }
  } catch (error) {
    if (!signal.aborted && controller.desiredSize !== null) {
      controller.error(error);
    }
    throw error;
  } finally {
    progressStreamReader.releaseLock();
  }
}

function handleFinalProgress(
  totalBytes: number,
  loadedBytes: number,
  onProgress: (info: ProgressInfo) => void
) {
  const finalTotal = totalBytes > 0 ? Math.max(totalBytes, loadedBytes) : loadedBytes;
  const percent = totalBytes > 0 ? 100 : null;

  onProgress({
    loaded: finalTotal,
    total: finalTotal,
    percent
  });
}

function reportProgress(
  loaded: number,
  total: number,
  onProgress: (info: ProgressInfo) => void
) {
  onProgress({
    loaded,
    total,
    percent: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null
  });
}

export async function controlledFetch(
  input: RequestInfo | URL,
  options: FetchWithControlsOptions = {}
): Promise<Response> {
  const {
    onProgress,
    progressInterval = DEFAULT_PROGRESS_INTERVAL,
    maxBufferSize = DEFAULT_MAX_BUFFER_SIZE,
    request: fetchRequestInit = {}
  } = options;

  const abortController = fetchRequestInit.signal ? undefined : new AbortController();
  const signal = (fetchRequestInit.signal ?? abortController?.signal) as AbortSignal;
  throwIfAborted(signal);

  if (typeof input === 'string' && !isValidUrl(input)) {
    const error = new TypeError(`Invalid URL: ${input}`);
    abortController?.abort(error);
    throw error;
  }

  const headers = new Headers({ ...DEFAULT_HEADERS, ...fetchRequestInit.headers });

  try {
    const response = await fetchWithErrorHandling(input, {
      ...DEFAULT_FETCH_OPTIONS,
      ...fetchRequestInit,
      headers,
      signal
    });

    if (!onProgress || !response.body) return response;

    const totalBytes = parseContentLength(response.headers);
    const [progressStream, bodyStream] = response.body.tee();

    let bodyReader: ReadableStreamDefaultReader<Uint8Array>;
    let bufferSize = 0;

    const managedStream = new ReadableStream<Uint8Array>({
      start(controller) {
        bodyReader = bodyStream.getReader();

        manageProgressProcessing(
          progressStream.getReader(),
          totalBytes,
          signal,
          onProgress,
          controller,
          progressInterval
        ).catch(() => {
          /* Intentional no-op */
        });
      },

      async pull(controller) {
        try {
          const { done, value } = await bodyReader.read();

          if (done || !value) {
            controller.close();
            return;
          }

          bufferSize += value.byteLength;

          if (bufferSize > maxBufferSize) {
            const error = new PixeliftBufferOverflowError(maxBufferSize, bufferSize);
            controller.error(error);
            abortController?.abort(error);
            return;
          }

          controller.enqueue(value);
          bufferSize -= value.byteLength;
        } catch (error) {
          controller.error(error);
          abortController?.abort(error);
        }
      },

      async cancel(reason) {
        await Promise.allSettled([
          bodyReader?.cancel(reason),
          progressStream.cancel(reason),
          bodyStream.cancel(reason)
        ]);
        bodyReader?.releaseLock();
        abortController?.abort(reason);
      }
    });

    return new Response(managedStream, response);
  } catch (error) {
    return handleFetchError(error, abortController, signal!);
  }
}

function parseContentLength(headers: Headers): number {
  const contentLength = headers.get('content-length');
  if (!contentLength) return 0;

  const parsed = parseInt(contentLength, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function handleFetchError(
  error: unknown,
  abortController?: AbortController,
  signal?: AbortSignal
): never {
  if (error instanceof DOMException && error.name === 'AbortError') {
    throw new PixeliftFetchAbortedError(error.message, { cause: error });
  }

  if (abortController && !signal?.aborted) {
    abortController.abort(error instanceof Error ? error : new Error(String(error)));
  }

  throw error;
}
