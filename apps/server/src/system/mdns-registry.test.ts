import { describe, it, expect, vi } from "vitest";
import {
  registerMdnsRefresh,
  refreshMdnsAdvertise,
  clearMdnsRefresh,
} from "./mdns-registry.js";

describe("mdns-registry", () => {
  it("registers, calls, and clears mdns refresh hook", () => {
    const hook = vi.fn();

    registerMdnsRefresh(hook);
    refreshMdnsAdvertise();
    expect(hook).toHaveBeenCalledTimes(1);

    clearMdnsRefresh();
    refreshMdnsAdvertise();
    expect(hook).toHaveBeenCalledTimes(1);
  });
});
