import { afterEach, describe, expect, it, vi } from "vitest";
import {
  demoteToSpare,
  getSafetyRole,
  isMidiOutAllowed,
  promoteToMaster,
  safetyNetStatus,
} from "./safety-net.js";

describe("safety-net", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to master when unset", () => {
    vi.stubEnv("STAGESYNC_SAFETY_ROLE", "");
    expect(getSafetyRole()).toBe("master");
    expect(isMidiOutAllowed()).toBe(true);
    expect(safetyNetStatus()).toEqual({
      role: "master",
      midiOutAllowed: true,
    });
  });

  it("spare disables MIDI OUT", () => {
    vi.stubEnv("STAGESYNC_SAFETY_ROLE", "spare");
    expect(getSafetyRole()).toBe("spare");
    expect(isMidiOutAllowed()).toBe(false);
    expect(safetyNetStatus().midiOutAllowed).toBe(false);
  });

  it("promote / demote flips runtime role", () => {
    vi.stubEnv("STAGESYNC_SAFETY_ROLE", "spare");
    expect(promoteToMaster()).toBe("master");
    expect(getSafetyRole()).toBe("master");
    expect(demoteToSpare()).toBe("spare");
    expect(isMidiOutAllowed()).toBe(false);
  });
});
