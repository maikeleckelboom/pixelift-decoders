import type { ResizeOptions } from '@/types';

export interface WorkerRequest {
  id: string | number;
  task: 'process';
  data: Uint8Array;
  resize?: ResizeOptions | undefined;
}

export interface WorkerSuccessResponse {
  id: string | number;
  task: 'process';
  width: number;
  height: number;
  result: Uint8ClampedArray;
}

export interface WorkerErrorResponse {
  id: string | number;
  task: 'error';
  error: string;
}

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

export interface TypedWorker {
  worker: Worker;
  terminate(): void;
  postMessage(message: WorkerRequest, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror?: ((event: ErrorEvent) => void) | null;
}
