/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/setlistApi.js", () => ({
  clearStageMessages: vi.fn(async () => undefined),
  dismissStageMessage: vi.fn(async () => undefined),
  fetchLiveDesk: vi.fn(async () => ({
    transpositionSemitones: 0,
    syncLeadMs: 0,
    clientEditEnabled: false,
  })),
  fetchStageClients: vi.fn(async () => []),
  fetchStageMessages: vi.fn(async () => []),
  patchLiveDesk: vi.fn(async () => ({
    transpositionSemitones: 0,
    syncLeadMs: 0,
    clientEditEnabled: false,
  })),
  sendStageMessage: vi.fn(async () => undefined),
}));

import { StageView } from "./StageView.js";

afterEach(() => {
  cleanup();
});

describe("StageView", () => {
  it("names Korekta, Komunikaty, and compose controls", async () => {
    render(<StageView />);
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: "Korekta na scenie" }),
      ).toBeTruthy();
    });
    expect(screen.getByRole("region", { name: "Komunikaty" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Klienci" })).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Treść komunikatu" }),
    ).toBeTruthy();
  });
});
