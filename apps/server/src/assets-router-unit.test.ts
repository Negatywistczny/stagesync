import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import multer from "multer";
import {
  createAssetsRouter,
  assetsUploadForTests,
  uploadSingleFileForTests,
} from "./routes/assets.js";
import { NotFoundError, type Stores } from "./storage/index.js";

describe("createAssetsRouter error paths", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()));
    });
    server = undefined;
  });

  async function listen(stores: Partial<Stores>): Promise<string> {
    const app = express();
    app.use("/api/projects/:id/assets", createAssetsRouter(stores as Stores));
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it("maps store failures on list/delete/file", async () => {
    const notFound = new NotFoundError("missing");
    const stores = {
      getProject: vi.fn(async () => {
        throw notFound;
      }),
      deleteProjectAsset: vi.fn(async () => {
        throw notFound;
      }),
      getAssetFilePath: vi.fn(async () => {
        throw notFound;
      }),
      addProjectAsset: vi.fn(),
    };

    const baseUrl = await listen(stores);

    expect((await fetch(`${baseUrl}/api/projects/p1/assets`)).status).toBe(404);
    expect(
      (
        await fetch(`${baseUrl}/api/projects/p1/assets/a1`, {
          method: "DELETE",
        })
      ).status,
    ).toBe(404);
    expect(
      (await fetch(`${baseUrl}/api/projects/p1/assets/a1/file`)).status,
    ).toBe(404);
  });

  it("rejects missing file field and unsupported extensions", async () => {
    const stores = {
      getProject: vi.fn(),
      addProjectAsset: vi.fn(),
      deleteProjectAsset: vi.fn(),
      getAssetFilePath: vi.fn(),
    };
    const baseUrl = await listen(stores);

    const missing = await fetch(`${baseUrl}/api/projects/p1/assets`, {
      method: "POST",
      body: new FormData(),
    });
    expect(missing.status).toBe(400);
    expect(((await missing.json()) as { ok: boolean }).ok).toBe(false);

    const form = new FormData();
    form.append("file", new Blob(["x"], { type: "text/plain" }), "notes.txt");
    const badExt = await fetch(`${baseUrl}/api/projects/p1/assets`, {
      method: "POST",
      body: form,
    });
    expect(badExt.status).toBe(400);
    expect(((await badExt.json()) as { ok: boolean }).ok).toBe(false);
    expect(stores.addProjectAsset).not.toHaveBeenCalled();
  });

  it("maps addProjectAsset store failures after a valid upload", async () => {
    const boom = new Error("disk-full");
    const stores = {
      getProject: vi.fn(),
      addProjectAsset: vi.fn(async () => {
        throw boom;
      }),
      deleteProjectAsset: vi.fn(),
      getAssetFilePath: vi.fn(),
    };
    const baseUrl = await listen(stores);

    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" }),
      "kick.wav",
    );
    const res = await fetch(`${baseUrl}/api/projects/p1/assets`, {
      method: "POST",
      body: form,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(false);
  });

  it("returns 413 when multer reports LIMIT_FILE_SIZE", () => {
    const next = vi.fn();
    let statusCode = 0;
    let body: { ok: boolean; error?: string } | undefined;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: { ok: boolean; error?: string }) {
        body = payload;
      },
    } as unknown as import("express").Response;

    const singleSpy = vi
      .spyOn(assetsUploadForTests, "single")
      .mockImplementation(() => (_req, _res, cb) => {
        cb(new multer.MulterError("LIMIT_FILE_SIZE"));
      });

    uploadSingleFileForTests({} as import("express").Request, res, next);
    expect(statusCode).toBe(413);
    expect(body).toEqual({ ok: false, error: "File too large" });
    expect(next).not.toHaveBeenCalled();
    singleSpy.mockRestore();
  });

  it("maps stream read errors via getAssetFilePath failure", async () => {
    const stores = {
      getProject: vi.fn(),
      addProjectAsset: vi.fn(),
      deleteProjectAsset: vi.fn(),
      getAssetFilePath: vi.fn(async () => {
        throw new Error("read fail");
      }),
    };
    const baseUrl = await listen(stores);
    const res = await fetch(`${baseUrl}/api/projects/p1/assets/a1/file`);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects missing project id in list route", async () => {
    const stores = {
      getProject: vi.fn(),
      addProjectAsset: vi.fn(),
      deleteProjectAsset: vi.fn(),
      getAssetFilePath: vi.fn(),
    };
    const baseUrl = await listen(stores);
    const res = await fetch(`${baseUrl}/api/projects//assets`);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("uploads flac and mxl with trackId and rounded startTicks", async () => {
    const stores = {
      getProject: vi.fn(),
      addProjectAsset: vi.fn(async (_pid, asset, _buf, opts) => ({
        assets: [asset],
        audioClips: [],
        audioTracks: [],
        ...opts,
      })),
      deleteProjectAsset: vi.fn(),
      getAssetFilePath: vi.fn(),
    };
    const baseUrl = await listen(stores);

    for (const [name, kind] of [
      ["stem.flac", "audio"],
      ["score.mxl", "musicxml"],
    ] as const) {
      const form = new FormData();
      form.append("file", new Blob([1, 2]), name);
      form.append("trackId", "track-1");
      form.append("startTicks", "10.7");
      const res = await fetch(`${baseUrl}/api/projects/p1/assets`, {
        method: "POST",
        body: form,
      });
      expect(res.status).toBe(201);
      expect(stores.addProjectAsset).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ kind }),
        expect.any(Buffer),
        expect.objectContaining({
          createAudioClip: kind === "audio",
          audioTrackId: "track-1",
          startTicks: 10,
        }),
      );
    }
  });
});
