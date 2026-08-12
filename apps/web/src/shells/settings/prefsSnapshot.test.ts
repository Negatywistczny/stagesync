// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  readLocalSnapshot,
  midiDraftEqual,
  prefsEqual,
  type MidiDraft,
} from "./prefsSnapshot.js";

describe("prefsSnapshot", () => {
  it("reads local snapshot and compares midi drafts and dirty states", () => {
    const snap1 = readLocalSnapshot();
    const snap2 = readLocalSnapshot();

    expect(prefsEqual(snap1, snap2)).toBe(true);

    const midiA: MidiDraft = {
      inputId: "in-1",
      outputId: "out-1",
      clockOutEnabled: true,
      inputChannel: 1,
      outputChannel: 1,
    };

    const midiB: MidiDraft = { ...midiA };
    expect(midiDraftEqual(midiA, midiB)).toBe(true);

    const midiC: MidiDraft = { ...midiA, outputChannel: 2 };
    expect(midiDraftEqual(midiA, midiC)).toBe(false);

    const dirtySnap = {
      ...snap2,
      latencyCompMs: snap2.latencyCompMs + 10,
    };
    expect(prefsEqual(snap1, dirtySnap)).toBe(false);
  });
});
