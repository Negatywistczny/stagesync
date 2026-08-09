/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { SmartTempoPage } from "./SmartTempoPage.js";

describe("SmartTempoPage", () => {
  it("renders header, navigation link and dashboard on dedicated page", () => {
    render(
      <MemoryRouter>
        <SmartTempoPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Analiza Smart Tempo vs Logic Pro")).toBeDefined();
    expect(screen.getByText("← Wróć do Panelu Admina")).toBeDefined();
    expect(
      screen.getByText("Smart Tempo 5.5 · Multi-Band Anchor Engine"),
    ).toBeDefined();
  });
});
