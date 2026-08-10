/**
 * Needleman–Wunsch word alignment. Returns for each `a` index the best `b`
 * index (or null) and a normalized score in [0, 1].
 */
export function alignWordSequences(
  a: readonly string[],
  b: readonly string[],
): { mapAtoB: (number | null)[]; score: number; matches: number } {
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) {
    return { mapAtoB: [], score: 1, matches: 0 };
  }
  if (n === 0 || m === 0) {
    return {
      mapAtoB: Array.from({ length: n }, () => null),
      score: 0,
      matches: 0,
    };
  }

  const MATCH = 2;
  const MISMATCH = -1;
  const GAP = -1;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0),
  );
  for (let i = 1; i <= n; i++) dp[i]![0] = i * GAP;
  for (let j = 1; j <= m; j++) dp[0]![j] = j * GAP;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag =
        dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? MATCH : MISMATCH);
      const up = dp[i - 1]![j]! + GAP;
      const left = dp[i]![j - 1]! + GAP;
      dp[i]![j] = Math.max(diag, up, left);
    }
  }

  const mapAtoB: (number | null)[] = Array.from({ length: n }, () => null);
  let i = n;
  let j = m;
  let matches = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const diag =
        dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? MATCH : MISMATCH);
      if (dp[i]![j] === diag) {
        mapAtoB[i - 1] = j - 1;
        if (a[i - 1] === b[j - 1]) matches += 1;
        i -= 1;
        j -= 1;
        continue;
      }
    }
    if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + GAP) {
      mapAtoB[i - 1] = null;
      i -= 1;
      continue;
    }
    j -= 1;
  }

  const denom = Math.max(n, m);
  const score = denom === 0 ? 1 : matches / denom;
  return { mapAtoB, score, matches };
}
