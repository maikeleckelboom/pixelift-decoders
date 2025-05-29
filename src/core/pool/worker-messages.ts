export type WorkerRequest = { task: 'process'; data: number[] };

export type WorkerResponse = { task: 'process'; result: number };
