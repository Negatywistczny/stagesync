import { describe, expect, it } from "vitest";
import { setlistBudgetPercent } from "./setlistBudget.js";

describe("setlistBudgetPercent", () => {
  it("maps totals into 0–100 progress", () => {
    expect(setlistBudgetPercent(30 * 60_000, 60 * 60_000)).toBe(50);
    expect(setlistBudgetPercent(60 * 60_000, 60 * 60_000)).toBe(100);
    expect(setlistBudgetPercent(90 * 60_000, 60 * 60_000)).toBe(100);
  });

  it("returns 0 for empty / invalid budgets", () => {
    expect(setlistBudgetPercent(0, 60_000)).toBe(0);
    expect(setlistBudgetPercent(-1, 60_000)).toBe(0);
    expect(setlistBudgetPercent(10_000, 0)).toBe(0);
    expect(setlistBudgetPercent(10_000, -5)).toBe(0);
    expect(setlistBudgetPercent(Number.NaN, 60_000)).toBe(0);
    expect(setlistBudgetPercent(10_000, Number.NaN)).toBe(0);
  });
});
