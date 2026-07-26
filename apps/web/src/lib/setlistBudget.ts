/**
 * Setlist time-budget progress (0–100) for Admin Set progressbar.
 * Pure — no Date; caller supplies totals.
 */
export function setlistBudgetPercent(
  totalMs: number,
  budgetMs: number,
): number {
  if (!(budgetMs > 0) || !Number.isFinite(totalMs) || totalMs <= 0) return 0;
  if (!Number.isFinite(budgetMs)) return 0;
  return Math.round(Math.min(1, totalMs / budgetMs) * 100);
}
