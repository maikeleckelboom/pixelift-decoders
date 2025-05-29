import { createCanvasPool } from '@/core/pool/canvas-pool.ts';
import { createWorkerPool } from '@/core/pool/worker-pool.ts';
import { createWithResource } from '@/core/pool/create-with-resource.ts';

const myCanvasPool = createCanvasPool(10);
export const withCanvas = createWithResource(myCanvasPool);

const myWorkerPool = createWorkerPool(8);
export const withWorker = createWithResource(myWorkerPool);
