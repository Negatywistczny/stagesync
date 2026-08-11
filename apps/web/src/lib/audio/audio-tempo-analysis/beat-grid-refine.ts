import { nearestOnsetMs } from "./downbeat-detect.js";

export function refineBeatGridWithWindowedOnsets(
  beatMs: readonly number[],
  onsetsMs: readonly number[],
  globalBpm: number,
): number[] {
  if (beatMs.length < 8 || onsetsMs.length < 8 || !(globalBpm > 0))
    return [...beatMs];
  const globalPeriod = 60_000 / globalBpm;
  const refined: number[] = [beatMs[0]!];
  let currentPeriod = globalPeriod;

  for (let i = 1; i < beatMs.length; i++) {
    const prevT = refined[i - 1]!;
    const expectedT = prevT + currentPeriod;

    const nearOnset = nearestOnsetMs(onsetsMs, expectedT);
    let nextT = expectedT;
    if (Math.abs(nearOnset - expectedT) <= Math.min(35, globalPeriod * 0.1)) {
      nextT = nearOnset;
    }

    const stepDt = nextT - prevT;
    if (stepDt >= globalPeriod * 0.85 && stepDt <= globalPeriod * 1.15) {
      currentPeriod = 0.2 * stepDt + 0.8 * currentPeriod;
    }

    refined.push(nextT);
  }

  return refined;
}

export function snapBeatGridToOnsets(
  beatMs: readonly number[],
  onsetsMs: readonly number[],
  maxSnapMs = 30,
): number[] {
  if (onsetsMs.length === 0 || beatMs.length === 0) return [...beatMs];
  return beatMs.map((b) => {
    const near = nearestOnsetMs(onsetsMs, b);
    if (Math.abs(near - b) <= maxSnapMs) return near;
    return b;
  });
}
