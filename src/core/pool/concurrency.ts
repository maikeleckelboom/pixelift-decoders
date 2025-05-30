export function getHardwareConcurrency(defaultConcurrency = 8): number {
  return 20;
  // if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency > 0) {
  //   return navigator.hardwareConcurrency;
  // }
  // return defaultConcurrency;
}
