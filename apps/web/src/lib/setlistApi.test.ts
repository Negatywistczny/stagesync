import { afterEach, describe, expect, it, vi } from "vitest";
import {
  browseServerPath,
  clearHostLogs,
  clearStageMessages,
  dismissStageMessage,
  downloadDiagnosticsExport,
  fetchHostLogs,
  fetchHostUpdateStatus,
  fetchLiveDesk,
  fetchMidiHostStatus,
  fetchNetworkInfo,
  fetchServerSettings,
  fetchSetlist,
  fetchStageClients,
  fetchStageMessages,
  patchLiveDesk,
  patchSetlistAutoAdvance,
  pickPrimaryJoinUrl,
  postApplyHostUpdate,
  postMidiPanic,
  postSystemRestart,
  postSystemShutdown,
  putMidiHostConfig,
  putServerSettings,
  putSetlist,
  sendStageMessage,
  type NetworkInfo,
} from "./setlistApi.js";

function okJson(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    headers: new Headers(),
    blob: async () => new Blob(),
  };
}

function errRes(status: number, body?: unknown) {
  return {
    ok: false,
    status,
    json: async () => body ?? { error: `fail-${status}` },
    headers: new Headers(),
  };
}

describe("setlistApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetchSetlist GETs /api/setlist", async () => {
    const view = { enabled: true, items: [], timeBudgetMinutes: 60 };
    const fetchMock = vi.fn().mockResolvedValue(okJson(view));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSetlist()).resolves.toEqual(view);
    expect(fetchMock).toHaveBeenCalledWith("/api/setlist");
  });

  it("putSetlist PUTs JSON body", async () => {
    const view = { enabled: false, items: [] };
    const fetchMock = vi.fn().mockResolvedValue(okJson(view));
    vi.stubGlobal("fetch", fetchMock);

    await putSetlist({ enabled: false, projectIds: ["a"] });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({
      enabled: false,
      projectIds: ["a"],
    });
  });

  it("patchSetlistAutoAdvance PATCHes enabled flag", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ enabled: true }));
    vi.stubGlobal("fetch", fetchMock);
    await patchSetlistAutoAdvance(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/setlist/auto-advance",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("stage message helpers round-trip payloads", async () => {
    const messages = [
      {
        id: "m1",
        text: "Go",
        ttlMs: 1000,
        sentAtMs: 1,
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ messages }))
      .mockResolvedValueOnce(okJson({ messages }))
      .mockResolvedValueOnce(okJson({ messages: [] }))
      .mockResolvedValueOnce(okJson({}));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendStageMessage({ text: "Go" })).resolves.toEqual(messages);
    await expect(fetchStageMessages()).resolves.toEqual(messages);
    await expect(dismissStageMessage("m1")).resolves.toEqual([]);
    await clearStageMessages();

    expect(fetchMock.mock.calls[0]![0]).toBe("/api/stage/message");
    expect(fetchMock.mock.calls[2]![0]).toBe("/api/stage/messages/m1");
    expect(fetchMock.mock.calls[3]![1]).toEqual({ method: "DELETE" });
  });

  it("fetchStageClients returns clients array", async () => {
    const clients = [
      {
        id: "c1",
        displayName: null,
        roles: ["grid"],
        latencyMs: 12,
        connectedAt: 1,
        updatedAt: 2,
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(okJson({ clients })),
    );
    await expect(fetchStageClients()).resolves.toEqual(clients);
  });

  it("live desk fetch/patch", async () => {
    const desk = {
      transpositionSemitones: 1,
      syncLeadMs: 200,
      clientEditEnabled: true,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson(desk))
      .mockResolvedValueOnce(okJson({ ...desk, syncLeadMs: 150 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchLiveDesk()).resolves.toEqual(desk);
    await expect(patchLiveDesk({ syncLeadMs: 150 })).resolves.toMatchObject({
      syncLeadMs: 150,
    });
  });

  it("host logs + midi + network", async () => {
    const lines = [{ t: 1, level: "info", msg: "hi" }];
    const midi = {
      available: true,
      backend: "mock" as const,
      config: {
        inputId: null,
        outputId: null,
        clockOutEnabled: false,
      },
      inputs: [],
      outputs: [],
      rates: {
        clockPerSec: 0,
        sppPerSec: 0,
        pcPerSec: 0,
        beatToWsPerSec: 0,
      },
      clockOutActive: false,
      lastError: null,
    };
    const net: NetworkInfo = {
      port: 4000,
      hostname: "host",
      lanAddresses: ["192.168.1.10"],
      urls: ["http://127.0.0.1:4000"],
      version: "5.0.0",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ lines }))
      .mockResolvedValueOnce(okJson({}))
      .mockResolvedValueOnce(okJson(midi))
      .mockResolvedValueOnce(okJson(midi))
      .mockResolvedValueOnce(
        okJson({ ok: true, sent: true, channels: 16, status: midi }),
      )
      .mockResolvedValueOnce(okJson(net));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchHostLogs()).resolves.toEqual(lines);
    await clearHostLogs();
    await expect(fetchMidiHostStatus()).resolves.toEqual(midi);
    await putMidiHostConfig({ clockOutEnabled: true });
    await postMidiPanic();
    await expect(fetchNetworkInfo()).resolves.toEqual(net);
  });

  it("server settings fetch/put with host token header", async () => {
    const store = new Map([["stagesync.hostToken", " tok "]]);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
    });
    const payload = {
      values: {
        PORT: "4000",
        STAGESYNC_BIND_HOST: "0.0.0.0",
        STAGESYNC_DISABLE_MDNS: false,
        LOG_LEVEL: "info",
        STAGESYNC_DISABLE_AUTO_UPDATE: false,
        STAGESYNC_UPDATE_CHANNEL: "stable",
        STAGESYNC_DATA_DIR: "",
        STAGESYNC_BACKUPS_DIR: "",
        STAGESYNC_ASSETS_DIR: "",
      },
      envExists: true,
      schema: {},
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson(payload))
      .mockResolvedValueOnce(okJson(payload));
    vi.stubGlobal("fetch", fetchMock);

    await fetchServerSettings();
    await putServerSettings({ PORT: "4100" });
    const [, getInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((getInit.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok",
    );
  });

  it("surfaces API error body and falls back to HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(errRes(503, { error: "busy" })),
    );
    await expect(fetchSetlist()).rejects.toThrow("busy");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error("no json");
        },
      }),
    );
    await expect(fetchSetlist()).rejects.toThrow("HTTP 502");
  });

  it("error paths for remaining endpoints", async () => {
    const boom = errRes(500, { error: "boom" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(boom));
    await expect(putSetlist({ enabled: true })).rejects.toThrow("boom");
    await expect(patchSetlistAutoAdvance(false)).rejects.toThrow("boom");
    await expect(sendStageMessage({ text: "x" })).rejects.toThrow("boom");
    await expect(fetchStageMessages()).rejects.toThrow("boom");
    await expect(dismissStageMessage("m")).rejects.toThrow("boom");
    await expect(clearStageMessages()).rejects.toThrow("boom");
    await expect(fetchStageClients()).rejects.toThrow("boom");
    await expect(fetchLiveDesk()).rejects.toThrow("boom");
    await expect(patchLiveDesk({})).rejects.toThrow("boom");
    await expect(fetchHostLogs()).rejects.toThrow("boom");
    await expect(clearHostLogs()).rejects.toThrow("boom");
    await expect(fetchNetworkInfo()).rejects.toThrow("boom");
    await expect(fetchMidiHostStatus()).rejects.toThrow("boom");
    await expect(putMidiHostConfig({})).rejects.toThrow("boom");
    await expect(postMidiPanic()).rejects.toThrow("boom");
    await expect(fetchServerSettings()).rejects.toThrow("boom");
    await expect(putServerSettings({})).rejects.toThrow("boom");
    await expect(browseServerPath({})).rejects.toThrow("boom");
    await expect(fetchHostUpdateStatus()).rejects.toThrow("boom");
    await expect(postApplyHostUpdate()).rejects.toThrow("boom");
    await expect(postSystemRestart()).rejects.toThrow("boom");
    await expect(postSystemShutdown()).rejects.toThrow("boom");
    await expect(downloadDiagnosticsExport()).rejects.toThrow("boom");
  });

  it("sendStageMessage returns empty when messages omitted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okJson({})));
    await expect(sendStageMessage({ text: "Hi" })).resolves.toEqual([]);
  });

  it("downloadDiagnosticsExport clicks anchor with disposition filename", async () => {
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn((node: unknown) => node);
    const anchor = {
      href: "",
      download: "",
      rel: "",
      click,
      remove,
    };
    vi.stubGlobal("document", {
      createElement: (tag: string) => {
        if (tag === "a") return anchor;
        throw new Error(`unexpected element ${tag}`);
      },
      body: { appendChild },
    });
    const createObjectURL = vi.fn(() => "blob:diag");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          "content-disposition": 'attachment; filename="diag.zip"',
        }),
        json: async () => ({}),
        blob: async () => new Blob(["z"]),
      }),
    );

    await downloadDiagnosticsExport();
    expect(createObjectURL).toHaveBeenCalled();
    expect(anchor.download).toBe("diag.zip");
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:diag");

    // fallback filename when disposition missing
    const a2 = {
      href: "",
      download: "",
      rel: "",
      click: vi.fn(),
      remove: vi.fn(),
    };
    vi.stubGlobal("document", {
      createElement: () => a2,
      body: { appendChild: vi.fn((n: unknown) => n) },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        blob: async () => new Blob(["z"]),
      }),
    );
    await downloadDiagnosticsExport();
    expect(a2.download).toMatch(/^stagesync-diagnostics-/);
  });

  it("host lifecycle endpoints + browse + update status", async () => {
    const store = new Map([["stagesync.hostToken", " tok "]]);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
    });
    const browse = {
      path: "/data",
      envPath: "DATA",
      parent: null,
      parentEnvPath: null,
      canSelectCurrent: true,
      entries: [],
    };
    const update = {
      current: "5.0.0",
      latest: "5.0.1",
      updateAvailable: true,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({}))
      .mockResolvedValueOnce(okJson({}))
      .mockResolvedValueOnce(okJson(browse))
      .mockResolvedValueOnce(okJson(browse))
      .mockResolvedValueOnce(okJson(update))
      .mockResolvedValueOnce(okJson({}));
    vi.stubGlobal("fetch", fetchMock);

    await postSystemRestart();
    await postSystemShutdown();
    await browseServerPath({ path: "/tmp", mode: "file", ext: ".env" });
    await browseServerPath({});
    await expect(fetchHostUpdateStatus()).resolves.toEqual(update);
    await postApplyHostUpdate();

    expect(fetchMock.mock.calls[0]![0]).toBe("/api/system/restart");
    expect(fetchMock.mock.calls[1]![0]).toBe("/api/system/shutdown");
    expect(String(fetchMock.mock.calls[2]![0])).toContain("mode=file");
    expect(String(fetchMock.mock.calls[2]![0])).toContain("ext=.env");
    expect(String(fetchMock.mock.calls[3]![0])).toContain("mode=dir");
    expect(fetchMock.mock.calls[4]![0]).toBe("/api/system/update-status");
    expect(fetchMock.mock.calls[5]![0]).toBe("/api/system/apply-update");
  });

  it("hostLifecycleHeaders tolerates localStorage throw", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(okJson({}));
    vi.stubGlobal("fetch", fetchMock);
    await postSystemRestart();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({});
  });

  it("pickPrimaryJoinUrl prefers LAN then non-loopback URL", () => {
    expect(
      pickPrimaryJoinUrl({
        port: 4000,
        hostname: "x",
        lanAddresses: ["10.0.0.2"],
        urls: ["http://127.0.0.1:4000"],
        version: "5",
      }),
    ).toBe("http://10.0.0.2:4000");

    expect(
      pickPrimaryJoinUrl({
        port: 4000,
        hostname: "x",
        lanAddresses: [],
        urls: ["http://127.0.0.1:4000", "http://stage.local:4000"],
        version: "5",
      }),
    ).toBe("http://stage.local:4000");

    expect(
      pickPrimaryJoinUrl({
        port: 4000,
        hostname: "x",
        lanAddresses: [],
        urls: ["http://127.0.0.1:4000"],
        version: "5",
      }),
    ).toBe("http://127.0.0.1:4000");

    expect(
      pickPrimaryJoinUrl({
        port: 4000,
        hostname: "x",
        lanAddresses: [],
        urls: [],
        version: "5",
      }),
    ).toBeNull();

    expect(
      pickPrimaryJoinUrl({
        port: 4000,
        hostname: "x",
        lanAddresses: [],
        urls: ["not a url", "http://ok.example:4000"],
        version: "5",
      }),
    ).toBe("http://ok.example:4000");
  });
});
