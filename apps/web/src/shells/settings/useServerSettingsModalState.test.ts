// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useServerSettingsModalState } from "./useServerSettingsModalState.js";

vi.mock("../../transport/useTransport.js", () => ({
  useTransport: () => ({ latencyMs: 12 }),
}));

vi.mock("@lib/shell-operator/setlistApi.js", () => ({
  fetchMidiHostStatus: vi.fn().mockResolvedValue({
    config: {
      inputId: "in-1",
      outputId: "out-1",
      clockOutEnabled: true,
      inputChannel: 1,
      outputChannel: 1,
    },
    ports: [],
  }),
  fetchServerSettings: vi.fn().mockResolvedValue({
    values: { PORT: 4000 },
    schema: [],
  }),
  putMidiHostConfig: vi.fn().mockResolvedValue({ ok: true }),
  putServerSettings: vi.fn().mockResolvedValue({ ok: true }),
  postMidiPanic: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@lib/audio/audioOutputPrefs.js", () => ({
  applyAudioOutputSink: vi.fn().mockResolvedValue(true),
  setStoredAudioOutputDeviceId: vi.fn(),
  getStoredAudioOutputDeviceId: vi.fn().mockReturnValue("default"),
  listAudioOutputDevices: vi.fn().mockResolvedValue([
    { deviceId: "default", label: "Głośniki systemowe", kind: "audiooutput" },
  ]),
}));

vi.mock("@lib/audio/metronome.js", () => ({
  getMetronomeAudioContext: () => ({ sampleRate: 48000 }),
  previewMetronomeClick: vi.fn().mockResolvedValue(undefined),
}));

describe("useServerSettingsModalState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with general tab and allows switching tabs", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useServerSettingsModalState(onClose, "general"),
    );

    expect(result.current.tab).toBe("general");

    act(() => {
      result.current.setTab("audio");
    });

    expect(result.current.tab).toBe("audio");
  });

  it("modifies appearance draft and detects changes", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useServerSettingsModalState(onClose, "general"),
    );

    act(() => {
      result.current.setDraft((d) => ({
        ...d,
        appearance: { theme: "light", contrast: "high" },
      }));
    });

    expect(result.current.draft.appearance.theme).toBe("light");
    expect(result.current.draft.appearance.contrast).toBe("high");
    expect(result.current.dirty).toBe(true);
  });

  it("handles discard and calls onClose", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useServerSettingsModalState(onClose, "general"),
    );

    act(() => {
      result.current.onDiscard();
    });

    expect(onClose).toHaveBeenCalled();
  });
});
