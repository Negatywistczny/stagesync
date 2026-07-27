import { describe, expect, it } from "vitest";
import {
  BREAKPOINT_MOBILE_COMPACT_MAX_PX,
  BREAKPOINT_MOBILE_MAX_PX,
  BREAKPOINT_TABLET_MAX_PX,
  MQ_MOBILE,
  MQ_MOBILE_COMPACT,
  MQ_TABLET,
} from "./breakpoints.js";

describe("breakpoints", () => {
  it("uses canonical 768 / 640 / 1024 thresholds", () => {
    expect(BREAKPOINT_MOBILE_MAX_PX).toBe(768);
    expect(BREAKPOINT_MOBILE_COMPACT_MAX_PX).toBe(640);
    expect(BREAKPOINT_TABLET_MAX_PX).toBe(1024);
    expect(MQ_MOBILE).toBe("(max-width: 768px)");
    expect(MQ_MOBILE_COMPACT).toBe("(max-width: 640px)");
    expect(MQ_TABLET).toBe("(max-width: 1024px)");
  });
});
