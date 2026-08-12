// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MapLaneInspector } from "./MapLaneInspector.js";

describe("MapLaneInspector", () => {
  it("renders count, lane name and active event id", () => {
    render(
      <MapLaneInspector
        selectedMapLane="tempo"
        selectedMapIds={["t-1", "t-2"]}
        primaryMapId="t-1"
      />,
    );

    expect(screen.getByRole("status").textContent).toContain(
      "Zaznaczono 2 · Tempo",
    );
    expect(screen.getByText("t-1")).toBeTruthy();
  });
});
