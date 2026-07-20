import { describe, expect, it } from "vitest";
import { buildNetworkInfo, getLanAddresses } from "./network-info.js";
import { isRunningUnderPm2 } from "./lifecycle.js";

describe("network-info", () => {
  it("buildNetworkInfo includes localhost url", () => {
    const info = buildNetworkInfo(4000);
    expect(info.port).toBe(4000);
    expect(info.urls.some((u) => u.includes("localhost:4000"))).toBe(true);
  });

  it("getLanAddresses returns array", () => {
    expect(Array.isArray(getLanAddresses())).toBe(true);
  });
});

describe("lifecycle helpers", () => {
  it("isRunningUnderPm2 is boolean", () => {
    expect(typeof isRunningUnderPm2()).toBe("boolean");
  });
});
