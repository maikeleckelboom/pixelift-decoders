import { createCanvasPool, createWithCanvas } from '@/core/pool/canvas-pool.ts';
import { createWorkerPool, createWithWorker } from '@/core/pool/worker-pool.ts';

// Custom canvas pool with 10 canvases
const myCanvasPool = createCanvasPool(10);
const withCanvas = createWithCanvas(myCanvasPool!); // you can check for null in production code

// Custom worker pool with 8 workers
const myWorkerPool = createWorkerPool(8);
const withWorker = createWithWorker(myWorkerPool!);
