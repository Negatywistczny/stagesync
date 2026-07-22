import { describe, expect, it, vi } from "vitest";
import { createStageHub } from "./stage-hub.js";

describe("createStageHub", () => {
  it("defaults ttlMs to 6000 when omitted", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const hub = createStageHub();
    const msg = hub.broadcast({ type: "stage_cue", text: "TERAZ" });
    expect(msg.ttlMs).toBe(6000);
    expect(msg.sentAtMs).toBe(1_700_000_000_000);
  });

  it("preserves ttlMs 0 as infinite signal", () => {
    const hub = createStageHub();
    const msg = hub.broadcast({
      type: "stage_cue",
      text: "HOLD",
      ttlMs: 0,
    });
    expect(msg.ttlMs).toBe(0);
  });
});
