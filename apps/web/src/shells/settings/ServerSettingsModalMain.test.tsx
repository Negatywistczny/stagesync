// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ServerSettingsModal } from "./ServerSettingsModalMain.js";

vi.mock("../../transport/useTransport.js", () => ({
  useTransport: () => ({
    latencyMs: 15,
  }),
}));

vi.mock("@lib/shell-operator/setlistApi.js", () => ({
  fetchMidiHostStatus: vi.fn().mockResolvedValue(null),
  fetchServerSettings: vi.fn().mockResolvedValue(null),
  browseServerPath: vi.fn().mockResolvedValue({ path: "/", items: [] }),
  postSystemRestore: vi.fn().mockResolvedValue({ ok: true }),
  postMidiPanic: vi.fn().mockResolvedValue({ ok: true }),
  putMidiHostConfig: vi.fn().mockResolvedValue({ ok: true }),
  putServerSettings: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("ServerSettingsModal", () => {
  it("renders tabs and modal shell and switches tabs", async () => {
    const onClose = vi.fn();

    await act(async () => {
      render(
        <ServerSettingsModal
          onClose={onClose}
          initialTab="general"
        />,
      );
    });

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Ogólne" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Audio" })).toBeTruthy();

    await act(async () => {
      const audioTab = screen.getByRole("tab", { name: "Audio" });
      fireEvent.click(audioTab);
    });

    expect(
      screen.getByRole("tab", { name: "Audio" }).getAttribute("aria-selected"),
    ).toBe("true");
  });
});
