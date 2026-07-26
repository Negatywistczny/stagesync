/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/setlistApi.js", () => ({
  fetchSetlist: vi.fn(async () => ({
    items: [],
    autoAdvance: false,
    timeBudgetMinutes: 90,
  })),
  patchSetlistAutoAdvance: vi.fn(async () => undefined),
  putSetlist: vi.fn(async () => undefined),
}));

import { SetView } from "./SetView.js";

afterEach(() => {
  cleanup();
});

describe("SetView", () => {
  it("names set toolbar and library/set panels", async () => {
    render(<SetView library={null} selectedId={null} />);
    await waitFor(() => {
      expect(
        screen.getByRole("toolbar", { name: "Akcje setlisty" }),
      ).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Wyczyść setlistę" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zapisz setlistę" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Set" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Biblioteka" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Kolejność setu" })).toBeTruthy();
  });
});
