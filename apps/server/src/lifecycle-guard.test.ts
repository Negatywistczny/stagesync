import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { assertLifecycleAllowed } from "./routes/system.js";

function mockReq(ip: string, headers: Record<string, string> = {}): Request {
  return {
    socket: { remoteAddress: ip },
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

describe("assertLifecycleAllowed", () => {
  it("allows loopback without env", () => {
    const res = mockRes();
    expect(assertLifecycleAllowed(mockReq("127.0.0.1"), res)).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it("rejects remote without token or allow flag", () => {
    vi.stubEnv("STAGESYNC_HOST_TOKEN", "");
    vi.stubEnv("STAGESYNC_ALLOW_REMOTE_LIFECYCLE", "");
    const res = mockRes();
    expect(assertLifecycleAllowed(mockReq("192.168.1.10"), res)).toBe(false);
    expect(res.statusCode).toBe(403);
    vi.unstubAllEnvs();
  });

  it("allows remote with matching bearer token", () => {
    vi.stubEnv("STAGESYNC_HOST_TOKEN", "secret");
    vi.stubEnv("STAGESYNC_ALLOW_REMOTE_LIFECYCLE", "");
    const res = mockRes();
    expect(
      assertLifecycleAllowed(
        mockReq("192.168.1.10", { authorization: "Bearer secret" }),
        res,
      ),
    ).toBe(true);
    vi.unstubAllEnvs();
  });
});
