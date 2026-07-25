import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import {
  assertOperatorPinAllowed,
  getConfiguredOperatorPin,
  isDestructiveApiRequest,
  isOperatorPinRequired,
  verifyOperatorPin,
} from "./operator-pin.js";

function mockReq(
  method: string,
  originalUrl: string,
  headers: Record<string, string> = {},
): Request {
  return {
    method,
    originalUrl,
    url: originalUrl,
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("operator-pin", () => {
  it("treats empty / whitespace PIN as disabled", () => {
    vi.stubEnv("STAGESYNC_OPERATOR_PIN", "");
    expect(getConfiguredOperatorPin()).toBeNull();
    expect(isOperatorPinRequired()).toBe(false);
    expect(verifyOperatorPin("anything")).toBe(true);
    vi.unstubAllEnvs();

    vi.stubEnv("STAGESYNC_OPERATOR_PIN", "   ");
    expect(getConfiguredOperatorPin()).toBeNull();
    vi.unstubAllEnvs();
  });

  it("requires matching header when PIN is set", () => {
    vi.stubEnv("STAGESYNC_OPERATOR_PIN", "1234");
    expect(isOperatorPinRequired()).toBe(true);
    expect(verifyOperatorPin("1234")).toBe(true);
    expect(verifyOperatorPin("9999")).toBe(false);

    const ok = mockRes();
    expect(
      assertOperatorPinAllowed(
        mockReq("PUT", "/api/projects/p1", {
          "x-stagesync-operator-pin": "1234",
        }),
        ok,
      ),
    ).toBe(true);

    const alt = mockRes();
    expect(
      assertOperatorPinAllowed(
        mockReq("PUT", "/api/projects/p1", { "x-stagesync-pin": "1234" }),
        alt,
      ),
    ).toBe(true);

    const bad = mockRes();
    expect(
      assertOperatorPinAllowed(mockReq("PUT", "/api/projects/p1"), bad),
    ).toBe(false);
    expect(bad.statusCode).toBe(403);
    vi.unstubAllEnvs();
  });

  it("classifies destructive vs show-critical paths", () => {
    expect(isDestructiveApiRequest(mockReq("GET", "/api/projects/p1"))).toBe(
      false,
    );
    expect(isDestructiveApiRequest(mockReq("PUT", "/api/projects/p1"))).toBe(
      true,
    );
    expect(isDestructiveApiRequest(mockReq("POST", "/api/setlist"))).toBe(true);
    expect(
      isDestructiveApiRequest(mockReq("POST", "/api/transport/load")),
    ).toBe(true);
    expect(
      isDestructiveApiRequest(mockReq("POST", "/api/transport/play")),
    ).toBe(false);
    expect(
      isDestructiveApiRequest(mockReq("POST", "/api/transport/pause")),
    ).toBe(false);
    expect(isDestructiveApiRequest(mockReq("POST", "/api/midi/panic"))).toBe(
      false,
    );
    expect(
      isDestructiveApiRequest(mockReq("POST", "/api/system/restart")),
    ).toBe(false);
    expect(
      isDestructiveApiRequest(mockReq("GET", "/api/system/operator-auth")),
    ).toBe(false);
    expect(
      isDestructiveApiRequest(mockReq("POST", "/api/system/operator-auth")),
    ).toBe(false);
  });
});
