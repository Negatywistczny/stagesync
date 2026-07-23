import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  deleteProjectAsset,
  uploadProjectAudio,
  uploadProjectMusicXml,
} from "./projectAssetsApi.js";

const project = createProjectV5Seed(
  "00000000-0000-4000-8000-000000000001",
  "Demo",
  "2026-07-23T12:00:00.000Z",
);

describe("projectAssetsApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uploadProjectAudio POSTs multipart FormData", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => project,
    });
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["wav"], "take.wav", { type: "audio/wav" });
    const result = await uploadProjectAudio(project.id, file, {
      trackId: "tr1",
    });

    expect(result.id).toBe(project.id);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/projects/${project.id}/assets`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.get("file")).toBe(file);
    expect(form.get("trackId")).toBe("tr1");
  });

  it("uploadProjectMusicXml is the same endpoint helper", () => {
    expect(uploadProjectMusicXml).toBe(uploadProjectAudio);
  });

  it("deleteProjectAsset DELETEs by asset id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => project,
    });
    vi.stubGlobal("fetch", fetchMock);

    await deleteProjectAsset(project.id, "asset/1");
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/projects/${project.id}/assets/asset%2F1`,
      { method: "DELETE" },
    );
  });

  it("throws API error message when upload fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 413,
        json: async () => ({ error: "too large" }),
      }),
    );
    await expect(
      uploadProjectAudio(project.id, new File([""], "x.wav")),
    ).rejects.toThrow("too large");
  });
});
