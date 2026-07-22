import express, { type Express } from "express";
import { join } from "node:path";
import type { HealthResponse } from "@stagesync/shared";
import { createClientPresence, type ClientPresence } from "./client-presence.js";
import {
  createFileLogger,
  installConsoleFileMirror,
} from "./file-logger.js";
import { createLogBuffer, type LogBuffer } from "./log-buffer.js";
import { createMidiHost, type MidiHost } from "./midi/host.js";
import { createMidiProgramChangeHandler } from "./midi/program-change.js";
import { wireMidiProgramChangeOut } from "./midi/program-change-out.js";
import { createLiveDeskStore, type LiveDeskStore } from "./live-desk.js";
import { createLiveDeskRouter } from "./routes/live-desk.js";
import { createLibraryRouter } from "./routes/library.js";
import { createMidiRouter } from "./routes/midi.js";
import { createProjectsRouter } from "./routes/projects.js";
import { createSetlistRouter } from "./routes/setlist.js";
import { createStageRouter } from "./routes/stage.js";
import { createSystemRouter } from "./routes/system.js";
import { createTransportRouter } from "./routes/transport.js";
import { sendError } from "./routes/errors.js";
import { createStores, type Stores } from "./storage/index.js";
import { defaultDataDir, resolveDataPaths } from "./storage/paths.js";
import { mountStaticWeb, resolveStaticDir } from "./static-web.js";
import {
  createTransportEngine,
  type TransportEngine,
} from "./transport/engine.js";
import { wirePauseAtSongEnd } from "./transport/pause-at-end.js";
import { wireSetlistAutoAdvance } from "./transport/auto-advance.js";
import { createStageHub, type StageHub } from "./transport/stage-hub.js";

function resolveServiceVersion(): string {
  const staged = process.env.STAGESYNC_VERSION?.trim();
  if (staged) return staged;
  const npm = process.env.npm_package_version?.trim();
  if (npm && npm !== "0.0.0") return npm;
  return "5.0.0";
}

const VERSION = resolveServiceVersion();

export type CreateAppOptions = {
  /** Override data root (defaults to STAGESYNC_DATA_DIR or repo data/). */
  dataDir?: string;
  stores?: Stores;
  transport?: TransportEngine;
  stageHub?: StageHub;
  liveDesk?: LiveDeskStore;
  logBuffer?: LogBuffer;
  presence?: ClientPresence;
  midi?: MidiHost;
  /** When set, enables POST /api/system/restart|shutdown. Omitted in unit tests. */
  lifecycle?: import("./lifecycle.js").Lifecycle;
  port?: number;
  /** Serve Vite `dist` (Docker / prod). Default: STAGESYNC_STATIC_DIR. */
  staticDir?: string | null;
  /** Skip console→file mirror (unit tests). */
  disableFileLogs?: boolean;
};

export type AppBundle = {
  app: Express;
  transport: TransportEngine;
  stageHub: StageHub;
  liveDesk: LiveDeskStore;
  stores: Stores;
  logBuffer: LogBuffer;
  presence: ClientPresence;
  midi: MidiHost;
};

export function createApp(options: CreateAppOptions = {}): AppBundle {
  const dataDir = options.dataDir ?? defaultDataDir();
  const logsDir = join(dataDir, "logs");
  const fileLogger =
    options.disableFileLogs === true || process.env.NODE_ENV === "test"
      ? null
      : createFileLogger(logsDir);
  if (fileLogger) {
    installConsoleFileMirror(fileLogger);
  }

  const stores = options.stores ?? createStores(dataDir);
  const transport = options.transport ?? createTransportEngine();
  const stageHub = options.stageHub ?? createStageHub();
  const midiPaths = resolveDataPaths(dataDir);
  const liveDesk =
    options.liveDesk ?? createLiveDeskStore(midiPaths.liveDeskFile);
  const logBuffer =
    options.logBuffer ??
    createLogBuffer({
      onPush: fileLogger
        ? (entry) => fileLogger.write(entry.level, entry.msg, entry.t)
        : undefined,
    });
  const presence = options.presence ?? createClientPresence();
  const midi =
    options.midi ??
    createMidiHost(transport, {
      onProgramChange: createMidiProgramChangeHandler(transport, stores),
      configFile: midiPaths.midiConfigFile,
    });
  wirePauseAtSongEnd(transport, stores);
  wireSetlistAutoAdvance(transport, stores);
  wireMidiProgramChangeOut(transport, stores, midi);
  const app: Express = express();

  app.use(express.json({ limit: "2mb" }));
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const e = err as { type?: string; status?: number; statusCode?: number };
      if (
        e?.type === "entity.too.large" ||
        e?.status === 413 ||
        e?.statusCode === 413
      ) {
        sendError(res, 413, "Payload too large");
        return;
      }
      next(err);
    },
  );

  app.get("/api/health", (_req, res) => {
    const body: HealthResponse = {
      ok: true,
      service: "stagesync-server",
      version: VERSION,
    };
    res.json(body);
  });

  app.use("/api/library", createLibraryRouter(stores));
  app.use("/api/projects", createProjectsRouter(stores, transport));
  app.use("/api/setlist", createSetlistRouter(stores, transport));
  app.use("/api/stage", createStageRouter(stageHub, presence));
  app.use("/api/live-desk", createLiveDeskRouter(liveDesk));
  app.use(
    "/api/system",
    createSystemRouter({
      logBuffer,
      lifecycle: options.lifecycle,
      port: options.port,
      version: VERSION,
      dataDir,
    }),
  );
  app.use("/api/transport", createTransportRouter(transport, stores));
  app.use("/api/midi", createMidiRouter(midi));

  // After all API routers: unknown /api/* must be JSON, never SPA HTML.
  app.use("/api", (_req, res) => {
    res.status(404).json({ ok: false, error: "Not found" });
  });

  const staticDir =
    options.staticDir === undefined ? resolveStaticDir() : options.staticDir;
  if (staticDir) {
    mountStaticWeb(app, staticDir);
    logBuffer.push("info", `static web: ${staticDir}`);
  }

  const midiStatus = midi.getStatus();
  logBuffer.push(
    "info",
    `MIDI backend: ${midiStatus.backend}` +
      (midiStatus.available ? "" : " (no device I/O)"),
  );
  logBuffer.push("info", `StageSync server ready (${VERSION})`);

  return { app, transport, stageHub, liveDesk, stores, logBuffer, presence, midi };
}
