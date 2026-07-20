import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectV3Seed } from "@stagesync/shared";
import {
  createProject,
  deleteProject,
  updateProject,
} from "./libraryApi.js";

const v3Project = createProjectV3Seed(
  "00000000-0000-4000-8000-000000000001",
  "Demo",
  "2026-07-19T12:00:00.000Z",
);

describe("libraryApi mutations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("createProject parses CreateProjectBodySchema before fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => v3Project,
    });
    vi.stubGlobal("fetch", fetchMock);

    await createProject("  Demo  ");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ name: "Demo" });
  });

  it("createProject does not fetch when name is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(createProject("   ")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updateProject fetches then PUTs full v3 document", async () => {
    const renamed = { ...v3Project, name: "Renamed" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => v3Project,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => renamed,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateProject(v3Project.id, { name: "  Renamed  " });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.name).toBe("Renamed");
    const [, putInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(String(putInit.body)) as {
      name: string;
      formatVersion: number;
    };
    expect(body.name).toBe("Renamed");
    expect(body.formatVersion).toBe(3);
  });

  it("updateProject does not fetch when name is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateProject("p1", { name: "" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deleteProject calls DELETE", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await deleteProject("p1");

    expect(fetchMock).toHaveBeenCalledWith("/api/projects/p1", {
      method: "DELETE",
    });
  });
});
