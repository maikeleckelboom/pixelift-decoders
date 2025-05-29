export function isBrowserMainThread(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function isBrowserWorker(): boolean {
  return typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
}

export function isNode(): boolean {
  return typeof process !== 'undefined' && !!process.versions?.node;
}

export function isNodeWorker(): boolean {
  return (
    isNode() &&
    typeof process.env !== 'undefined' &&
    process.env.NODE_WORKER_THREADS === 'true'
  );
}

export function isServer(): boolean {
  // true if Node.js environment (including workers)
  return typeof process !== 'undefined' && !!process.versions?.node;
}
