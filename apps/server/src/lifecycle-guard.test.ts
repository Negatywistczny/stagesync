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

  it("allows remote when STAGESYNC_ALLOW_REMOTE_LIFECYCLE=1", () => {
    vi.stubEnv("STAGESYNC_ALLOW_REMOTE_LIFECYCLE", "1");
    vi.stubEnv("STAGESYNC_HOST_TOKEN", "");
    const res = mockRes();
    expect(assertLifecycleAllowed(mockReq("10.0.0.2"), res)).toBe(true);
    vi.unstubAllEnvs();
  });

  it("allows remote via x-stagesync-host-token header", () => {
    vi.stubEnv("STAGESYNC_HOST_TOKEN", "secret");
    vi.stubEnv("STAGESYNC_ALLOW_REMOTE_LIFECYCLE", "");
    const res = mockRes();
    expect(
      assertLifecycleAllowed(
        mockReq("10.0.0.2", { "x-stagesync-host-token": "secret" }),
        res,
      ),
    ).toBe(true);
    vi.unstubAllEnvs();
  });

  it("allows ::1 and ::ffff:127.0.0.1 as loopback", () => {
    const res = mockRes();
    expect(assertLifecycleAllowed(mockReq("::1"), res)).toBe(true);
    expect(assertLifecycleAllowed(mockReq("::ffff:127.0.0.1"), res)).toBe(true);
  });
});
