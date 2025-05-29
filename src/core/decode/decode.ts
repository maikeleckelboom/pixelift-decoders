import type { FitMode, PixelData, ResizeOptions } from '@/types';
import { decodeWithCanvas } from '@/core/decode/decodeWithCanvas.ts';
import { decodeWithCanvasWorker } from '@/core/decode/decodeWithCanvasWorker.ts';
import { withWorker } from '@/core/pool/worker-pool.ts';
import type { TypedWorker } from '@/core/pool/worker-types.ts';
interface DecodeOptions {
  resize?: ResizeOptions;
  signal?: AbortSignal;
  preferWorker?: boolean;
}
