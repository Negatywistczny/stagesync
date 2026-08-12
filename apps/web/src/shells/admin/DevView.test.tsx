// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DevView } from "./DevView.js";

describe("DevView", () => {
  it("renders dev navigation tiles and preview shortcuts", () => {
    render(
      <MemoryRouter>
        <DevView />
      </MemoryRouter>,
    );

    expect(screen.getByText("Testy · benchmarki")).toBeTruthy();
    expect(screen.getByText("Smart Tempo — dokładność siatki")).toBeTruthy();
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });
});
