// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CycleRow } from "./CycleRow.js";
import type { GridCycleStep } from "@lib/timeline/clientGrid.js";

describe("CycleRow", () => {
  it("renders chord steps in the cycle", () => {
    const cycle: GridCycleStep[] = [
      {
        symbol: "Am",
        bars: 2,
        active: true,
        activeBarInStep: 1,
        isSubBar: false,
      },
      {
        symbol: "G",
        bars: 2,
        active: false,
        activeBarInStep: 1,
        isSubBar: false,
      },
    ];

    const fmtParts = (symbol: string) => ({
      root: symbol[0] ?? "",
      quality: symbol.slice(1),
      bass: "",
      plain: symbol,
      sup: "",
    });

    render(<CycleRow cycle={cycle} fmtParts={fmtParts} active={true} />);

    expect(screen.getByLabelText("Cykl akordów")).toBeTruthy();
    expect(screen.getByLabelText("Am · 2 takty")).toBeTruthy();
    expect(screen.getByLabelText("G · 2 takty")).toBeTruthy();
  });
});
