// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GridPaneBody } from "./GridPaneBody.js";
import type { GridCycleStep } from "@lib/timeline/clientGrid.js";

describe("GridPaneBody", () => {
  it("renders hero chord and current cycle steps", () => {
    const cycle: GridCycleStep[] = [
      { symbol: "Am", bars: 2, active: true, isSubBar: false },
      { symbol: "F", bars: 2, active: false, isSubBar: false },
    ];

    const nextCycle: GridCycleStep[] = [
      { symbol: "C", bars: 2, active: false, isSubBar: false },
      { symbol: "G", bars: 2, active: false, isSubBar: false },
    ];

    const fmtParts = (symbol: string) => ({
      root: symbol[0],
      quality: symbol.slice(1),
      bass: "",
      plain: symbol,
    });

    render(
      <GridPaneBody
        subsectionLabel="Refren"
        cycle={cycle}
        nextCycle={nextCycle}
        carouselKey="car-1"
        countdownPreview={false}
        heroRaw="Am"
        heroNextRaw="F"
        isCountdown={false}
        fmtParts={fmtParts}
        gridAnimations={false}
      />,
    );

    expect(screen.getByText("Refren")).toBeTruthy();
    expect(screen.getByLabelText("Następny akord")).toBeTruthy();
  });
});
