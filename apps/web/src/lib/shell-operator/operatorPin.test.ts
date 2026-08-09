/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  clearStoredOperatorPin,
  fetchOperatorPinRequired,
  getStoredOperatorPin,
  mergeApiHeaders,
  operatorPinHeaders,
  setStoredOperatorPin,
  unlockOperatorPin,
  OPERATOR_PIN_HEADER,
  OPERATOR_PIN_STORAGE_KEY,
} from "./operatorPin.js";

describe("operatorPin", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("stores and clears session PIN", () => {
    expect(getStoredOperatorPin()).toBeNull();
    setStoredOperatorPin(" 1234 ");
    expect(getStoredOperatorPin()).toBe("1234");
    expect(operatorPinHeaders()).toEqual({
      [OPERATOR_PIN_HEADER]: "1234",
    });
    expect(sessionStorage.getItem(OPERATOR_PIN_STORAGE_KEY)).toBe("1234");
    clearStoredOperatorPin();
    expect(getStoredOperatorPin()).toBeNull();
    expect(operatorPinHeaders()).toEqual({});
  });

  it("mergeApiHeaders keeps content-type and adds PIN", () => {
    setStoredOperatorPin("99");
    expect(mergeApiHeaders({ "content-type": "application/json" })).toEqual({
      [OPERATOR_PIN_HEADER]: "99",
      "content-type": "application/json",
    });
  });

  it("mergeApiHeaders accepts Headers and tuple arrays", () => {
    setStoredOperatorPin("42");
    const headers = new Headers({ Accept: "application/json" });
    expect(mergeApiHeaders(headers)).toEqual({
      [OPERATOR_PIN_HEADER]: "42",
      accept: "application/json",
    });
    expect(
      mergeApiHeaders([
        ["X-Custom", "1"],
        ["X-Other", "2"],
      ]),
    ).toEqual({
      [OPERATOR_PIN_HEADER]: "42",
      "X-Custom": "1",
      "X-Other": "2",
    });
    expect(mergeApiHeaders()).toEqual({
      [OPERATOR_PIN_HEADER]: "42",
    });
  });

  it("treats blank PIN as clear and tolerates sessionStorage throws", () => {
    setStoredOperatorPin("1234");
    setStoredOperatorPin("   ");
    expect(getStoredOperatorPin()).toBeNull();

    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    });
    expect(getStoredOperatorPin()).toBeNull();
    expect(() => clearStoredOperatorPin()).not.toThrow();
    expect(operatorPinHeaders()).toEqual({});
  });

  it("fetchOperatorPinRequired rejects non-OK HTTP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    );
    await expect(fetchOperatorPinRequired()).rejects.toThrow(/HTTP 503/);
  });

  it("unlockOperatorPin falls back when error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error("no json");
        },
      }),
    );
    await expect(unlockOperatorPin("0000")).rejects.toThrow(
      /Nieprawidłowy PIN operatora/,
    );
  });

  it("fetchOperatorPinRequired reads host flag", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ required: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchOperatorPinRequired()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/system/operator-auth", {
      cache: "no-store",
    });
  });

  it("unlockOperatorPin verifies then stores", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, required: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await unlockOperatorPin("5555");
    expect(getStoredOperatorPin()).toBe("5555");
    expect(fetchMock).toHaveBeenCalledWith("/api/system/operator-auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin: "5555" }),
    });
  });

  it("unlockOperatorPin rejects bad PIN", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Nieprawidłowy PIN operatora." }),
      }),
    );
    await expect(unlockOperatorPin("0000")).rejects.toThrow(/PIN/);
    expect(getStoredOperatorPin()).toBeNull();
  });
});
