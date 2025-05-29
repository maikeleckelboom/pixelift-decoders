export function getHardwareConcurrency(defaultConcurrency = 4): number {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency > 0) {
    return navigator.hardwareConcurrency;
  }
  return defaultConcurrency;
}
