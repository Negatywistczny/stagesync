import { describe, expect, it } from "vitest";
import {
  buildNetworkInfo,
  getLanAddresses,
  pickPrimaryJoinUrl,
} from "./network-info.js";
import { isRunningUnderPm2 } from "./lifecycle.js";

describe("network-info", () => {
  it("buildNetworkInfo includes localhost url after LAN", () => {
    const info = buildNetworkInfo(4000);
    expect(info.port).toBe(4000);
    expect(info.urls.some((u) => u.includes("localhost:4000"))).toBe(true);
    const localhostIdx = info.urls.findIndex((u) =>
      u.includes("localhost:4000"),
    );
    expect(localhostIdx).toBe(info.urls.length - 1);
    if (info.lanAddresses.length > 0) {
      expect(info.urls[0]).toBe(`http://${info.lanAddresses[0]}:4000`);
      expect(info.urls[0]).not.toContain("localhost");
    }
  });

  it("pickPrimaryJoinUrl prefers non-loopback", () => {
    expect(
      pickPrimaryJoinUrl([
        "http://localhost:4000",
        "http://192.168.1.10:4000",
      ]),
    ).toBe("http://192.168.1.10:4000");
    expect(pickPrimaryJoinUrl(["http://127.0.0.1:4000"])).toBe(
      "http://127.0.0.1:4000",
    );
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
