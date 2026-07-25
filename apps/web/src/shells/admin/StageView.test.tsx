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
  fetchStageMessages: vi.fn(async () => [
    {
      id: "m1",
      text: "  Zmiana tonacji za 2 takty  ",
      priority: "normal",
      roles: ["karaoke"],
      createdAt: Date.now(),
    },
  ]),
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

describe("StageView delete message aria", () => {
  it("names Usuń with message text", async () => {
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
