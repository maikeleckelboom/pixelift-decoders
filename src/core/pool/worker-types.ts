import type { ResizeOptions } from '@/types';
import type { CanvasDefaultSettings } from '@/decoders/canvas/defaults.ts';

export interface WorkerTask {
  id: number;
  type: 'decode';
  data: Uint8Array;
  resize?: ResizeOptions | undefined;
  settings?: CanvasDefaultSettings;
}

export interface WorkerSuccessResponse {
  id: number;
  type: 'success';
  width: number;
  height: number;
  result: Uint8ClampedArray;
}

export interface WorkerErrorResponse {
  id: number;
  type: 'error';
  error: {
    message: string;
    stack?: string;
    name?: string;
  };
}

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;
