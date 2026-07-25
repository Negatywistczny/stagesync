/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const fetchStageMessages = vi.fn(async () => [] as unknown[]);

vi.mock("../../lib/setlistApi.js", () => ({
  clearStageMessages: vi.fn(async () => undefined),
  dismissStageMessage: vi.fn(async () => undefined),
  fetchLiveDesk: vi.fn(async () => ({
    transpositionSemitones: 0,
    syncLeadMs: 0,
    clientEditEnabled: false,
  })),
  fetchStageClients: vi.fn(async () => []),
  fetchStageMessages: (...args: unknown[]) => fetchStageMessages(...args),
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
  fetchStageMessages.mockReset();
  fetchStageMessages.mockResolvedValue([]);
});

describe("StageView regions and delete aria", () => {
  it("names Korekta, Komunikaty, and compose controls", async () => {
    fetchStageMessages.mockResolvedValue([]);
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

  it("names Usuń with message text", async () => {
    fetchStageMessages.mockResolvedValue([
      {
        id: "m1",
        text: "  Zmiana tonacji za 2 takty  ",
        priority: "normal",
        roles: ["karaoke"],
        createdAt: Date.now(),
      },
    ]);
    render(<StageView />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Usuń komunikat: Zmiana tonacji za 2 takty",
        }),
      ).toBeTruthy();
    });
  });
});
