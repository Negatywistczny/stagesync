// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminFooter } from "./AdminFooter.js";

describe("AdminFooter", () => {
  it("renders song title, section, bpm, and connection status", () => {
    render(
      <AdminFooter
        nowName="Superstition"
        nextName="Sir Duke"
        selectedId="s1"
        activeProjectId="s1"
        selectedName="Superstition"
        activeSection={{
          id: "sec1",
          name: "Zwrotka 1",
          kind: "section",
          startTicks: 0,
          lengthTicks: 3840,
        }}
        clockLabel="01:23.45"
        bpm={100}
        timeSignature={{ numerator: 4, denominator: 4 }}
        wsStatus="connected"
      />,
    );

    expect(screen.getByText("Superstition")).toBeTruthy();
    expect(screen.getByText("Zwrotka 1")).toBeTruthy();
    expect(screen.getByText("100 BPM")).toBeTruthy();
    expect(screen.getByText("4/4")).toBeTruthy();
    expect(screen.getByText("Połączony")).toBeTruthy();
  });
});
