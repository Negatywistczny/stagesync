import { describe, expect, it } from "vitest";
import {
  formatDiscoveryMeta,
  formatDiscoveryTitle,
  formatDiscoveryVersionLabel,
  normalizeDiscoveryVersion,
} from "./host-discovery.js";

describe("host-discovery", () => {
  it("normalizeDiscoveryVersion converts dash semver and strips v prefix", () => {
    expect(normalizeDiscoveryVersion("v5.3.0")).toBe("5.3.0");
    expect(normalizeDiscoveryVersion("5-3-0")).toBe("5.3.0");
    expect(normalizeDiscoveryVersion("  ")).toBeNull();
  });

  it("formatDiscoveryVersionLabel prefixes v", () => {
    expect(formatDiscoveryVersionLabel("5.3.0")).toBe("v5.3.0");
    expect(formatDiscoveryVersionLabel("5-3-0")).toBe("v5.3.0");
  });

  it("formatDiscoveryTitle prefers hostname over service name", () => {
    expect(
      formatDiscoveryTitle({
        hostname: "FOH Mac Mini",
        origin: "http://192.168.0.12:4000",
        serviceName: "StageSync 5.3.0",
      }),
    ).toBe("FOH Mac Mini");
  });

  it("formatDiscoveryTitle rejects StageSync service names", () => {
    expect(
      formatDiscoveryTitle({
        hostname: "StageSync 5.3.0",
        origin: "http://192.168.0.12:4000",
        serviceName: "StageSync 5-3-0",
      }),
    ).toBe("192.168.0.12:4000");
  });

  it("formatDiscoveryTitle falls back to origin host", () => {
    expect(
      formatDiscoveryTitle({
        origin: "http://10.0.0.5:4000",
        serviceName: "StageSync",
      }),
    ).toBe("10.0.0.5:4000");
  });

  it("formatDiscoveryMeta joins origin version and project", () => {
    expect(
      formatDiscoveryMeta({
        origin: "http://192.168.0.12:4000",
        version: "5.3.0",
        project: "Tour 2026",
      }),
    ).toBe("192.168.0.12:4000 · v5.3.0 · Tour 2026");
  });

  it("formatDiscoveryMeta omits default project placeholder", () => {
    expect(
      formatDiscoveryMeta({
        origin: "http://192.168.0.12:4000",
        version: "5.3.0",
        project: "Brak projektu",
      }),
    ).toBe("192.168.0.12:4000 · v5.3.0");
  });
});
