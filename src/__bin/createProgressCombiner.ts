export type ProgressPercentCallback = (percent: number) => void;

export function createProgressCombiner<ProgressKey extends string>(
  weights: Record<ProgressKey, number>,
  callback: ProgressPercentCallback
): Record<ProgressKey, (progress: number) => void> {
  const progressState = {} as Record<ProgressKey, number>;
  let combinedProgress = 0;

  for (const key in weights) {
    progressState[key] = 0;
  }

  const reporters = {} as Record<ProgressKey, (progress: number) => void>;

  for (const key in weights) {
    reporters[key] = (progress: number) => {
      if (progress !== progressState[key]) {
        const weight = weights[key];
        combinedProgress -= progressState[key] * weight;
        combinedProgress += progress * weight;

        progressState[key] = progress;
        callback(combinedProgress);
      }
    };
  }

  return reporters;
}
