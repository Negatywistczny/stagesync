import { describe, it, expect } from "vitest";
import {
  getLanAddresses,
  isLoopbackJoinUrl,
  pickPrimaryJoinUrl,
  normalizeAdvertiseHostname,
  resolveAdvertiseHostname,
  resolveHostDisplayName,
} from "./network-info.js";

describe("network-info", () => {
  it("getLanAddresses returns an array of network interfaces", () => {
    const list = getLanAddresses();
    expect(Array.isArray(list)).toBe(true);
    for (const item of list) {
      expect(item.family).toBe("IPv4");
      expect(item.internal).toBe(false);
    }
  });

  it("isLoopbackJoinUrl correctly identifies loopback URLs", () => {
    expect(isLoopbackJoinUrl("http://localhost:4000/join")).toBe(true);
    expect(isLoopbackJoinUrl("http://127.0.0.1:4000/join")).toBe(true);
    expect(isLoopbackJoinUrl("http://192.168.1.50:4000/join")).toBe(false);
    expect(isLoopbackJoinUrl("http://stagesync.local:4000/join")).toBe(false);
  });

  it("pickPrimaryJoinUrl picks non-loopback URL first", () => {
    const urls = [
      "http://localhost:4000/join",
      "http://192.168.1.100:4000/join",
    ];
    expect(pickPrimaryJoinUrl(urls)).toBe("http://192.168.1.100:4000/join");

    expect(pickPrimaryJoinUrl(["http://127.0.0.1:4000/join"])).toBe(
      "http://127.0.0.1:4000/join",
    );
    expect(pickPrimaryJoinUrl([])).toBe(null);
  });

  it("normalizeAdvertiseHostname strips .local and limits length", () => {
    expect(normalizeAdvertiseHostname("my-macbook.local")).toBe("my-macbook");
    expect(normalizeAdvertiseHostname("my-macbook.local.")).toBe("my-macbook");
    expect(normalizeAdvertiseHostname("   ")).toBe("localhost");
  });

  it("resolveAdvertiseHostname and resolveHostDisplayName return valid strings", () => {
    const host = resolveAdvertiseHostname();
    expect(typeof host).toBe("string");
    expect(host.length).toBeGreaterThan(0);

    const displayName = resolveHostDisplayName();
    expect(typeof displayName).toBe("string");
    expect(displayName.length).toBeGreaterThan(0);
  });
});
