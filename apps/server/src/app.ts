import express, { type Express } from "express";
import type { HealthResponse } from "@stagesync/shared";
import { createClientPresence, type ClientPresence } from "./client-presence.js";
import { createLogBuffer, type LogBuffer } from "./log-buffer.js";
import { createLibraryRouter } from "./routes/library.js";
import { createProjectsRouter } from "./routes/projects.js";
import { createSetlistRouter } from "./routes/setlist.js";
import { createStageRouter } from "./routes/stage.js";
import { createSystemRouter } from "./routes/system.js";
import { createTransportRouter } from "./routes/transport.js";
import { createStores, type Stores } from "./storage/index.js";
import { defaultDataDir } from "./storage/paths.js";
import { mountStaticWeb, resolveStaticDir } from "./static-web.js";
import {
  createTransportEngine,
  type TransportEngine,
} from "./transport/engine.js";
import { createStageHub, type StageHub } from "./transport/stage-hub.js";

const VERSION = process.env.npm_package_version ?? "5.0.0-beta.1";

export type CreateAppOptions = {
  /** Override data root (defaults to STAGESYNC_DATA_DIR or repo data/). */
  dataDir?: string;
  stores?: Stores;
  transport?: TransportEngine;
  stageHub?: StageHub;
  logBuffer?: LogBuffer;
  presence?: ClientPresence;
  /** When set, enables POST /api/system/restart|shutdown. Omitted in unit tests. */
  lifecycle?: import("./lifecycle.js").Lifecycle;
  port?: number;
  /** Serve Vite `dist` (Docker / prod). Default: STAGESYNC_STATIC_DIR. */
  staticDir?: string | null;
};

export type AppBundle = {
  app: Express;
  transport: TransportEngine;
  stageHub: StageHub;
  stores: Stores;
  logBuffer: LogBuffer;
  presence: ClientPresence;
};

export function createApp(options: CreateAppOptions = {}): AppBundle {
  const dataDir = options.dataDir ?? defaultDataDir();
  const stores = options.stores ?? createStores(dataDir);
  const transport = options.transport ?? createTransportEngine();
  const stageHub = options.stageHub ?? createStageHub();
  const logBuffer = options.logBuffer ?? createLogBuffer();
  const presence = options.presence ?? createClientPresence();
  const app: Express = express();

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const body: HealthResponse = {
      ok: true,
      service: "stagesync-server",
      version: VERSION,
    };
    res.json(body);
  });

  app.use("/api/library", createLibraryRouter(stores));
  app.use("/api/projects", createProjectsRouter(stores));
  app.use("/api/setlist", createSetlistRouter(stores, transport));
  app.use("/api/stage", createStageRouter(stageHub, presence));
  app.use(
    "/api/system",
    createSystemRouter({
      logBuffer,
      lifecycle: options.lifecycle,
      port: options.port,
      version: VERSION,
    }),
  );
  app.use("/api/transport", createTransportRouter(transport, stores));

  const staticDir =
    options.staticDir === undefined ? resolveStaticDir() : options.staticDir;
  if (staticDir) {
    mountStaticWeb(app, staticDir);
    logBuffer.push("info", `static web: ${staticDir}`);
  }

  logBuffer.push("info", `StageSync server ready (${VERSION})`);

  return { app, transport, stageHub, stores, logBuffer, presence };
}
