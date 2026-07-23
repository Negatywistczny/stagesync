import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import { z } from "zod";
import {
  ConflictError,
  InvalidProjectIdError,
  NotFoundError,
  StorageError,
} from "../storage/index.js";
import { handleRouteError, sendError } from "./errors.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & {
    statusCode: number;
    body: { ok: false; error: string; details?: unknown[] };
  };
}

describe("routes/errors", () => {
  it("sendError omits empty details", () => {
    const res = mockRes();
    sendError(res, 400, "x", []);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ ok: false, error: "x" });
  });

  it("maps Zod details with codes and root path", () => {
    const res = mockRes();
    try {
      z.object({ n: z.number() }).parse({ n: "bad" });
    } catch (err) {
      handleRouteError(res, err);
    }
    expect(res.statusCode).toBe(400);
    expect(res.body.details?.length).toBeGreaterThan(0);

    const res2 = mockRes();
    handleRouteError(res2, {
      name: "ZodError",
      issues: [
        { message: "Required", path: ["a"], code: "invalid_type" },
        { message: "root", path: [] },
      ],
    });
    expect(res2.body.details?.[0]).toMatchObject({
      path: "a",
      code: "invalid_type",
    });
    expect(res2.body.details?.[1]?.path).toBe("(root)");
  });

  it("maps RangeError, InvalidProjectId, NotFound, Conflict, Storage, generic", () => {
    const cases: Array<{ err: unknown; status: number; match: RegExp }> = [
      { err: new RangeError("range"), status: 400, match: /range/ },
      {
        err: new InvalidProjectIdError("bad-id"),
        status: 400,
        match: /bad-id/,
      },
      { err: new NotFoundError("gone"), status: 404, match: /gone/ },
      { err: new ConflictError("stale"), status: 409, match: /stale/ },
      { err: new StorageError("disk"), status: 500, match: /disk/ },
      { err: new Error("boom"), status: 500, match: /boom/ },
      { err: "string-err", status: 500, match: /Internal/ },
    ];
    for (const c of cases) {
      const res = mockRes();
      handleRouteError(res, c.err);
      expect(res.statusCode).toBe(c.status);
      expect(res.body.error).toMatch(c.match);
    }
  });
});
