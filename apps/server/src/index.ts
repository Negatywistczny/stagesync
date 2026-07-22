import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createLifecycle } from "./lifecycle.js";
import { migrateVolumeOnBoot } from "./storage/migrate-volume.js";
import { attachTransportWs } from "./transport/ws.js";

function resolveListenPort(): number {
  const raw = process.env.PORT;
  if (raw == null || raw === "") return 4000;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    console.error(
      `[stagesync-server] invalid PORT=${JSON.stringify(raw)} (need integer 1…65535); using 4000`,
    );
    return 4000;
  }
  return n;
}

const PORT = resolveListenPort();
/** Hot-reload races (tsx watch) often hit EADDRINUSE briefly — retry instead of crashing. */
const LISTEN_RETRY_MS = 250;
const LISTEN_RETRY_MAX = 40;

const server = createServer();

let disposeMidi: (() => void) | null = null;
let disposeTransport: (() => void) | null = null;
const lifecycle = createLifecycle(server, {
  log: (msg) => console.log(`[stagesync-server] ${msg}`),
  onBeforeClose: () => {
    try {
      disposeTransport?.();
    } catch {
      /* ignore */
    }
    try {
      disposeMidi?.();
    } catch {
      /* ignore */
    }
  },
});

const { app, transport, stageHub, presence, logBuffer, stores, midi } =
  createApp({
    lifecycle,
    port: PORT,
  });
disposeTransport = () => transport.dispose();
disposeMidi = () => midi.dispose();

server.on("request", app);
attachTransportWs(server, transport, stageHub, presence);

function startListening(retriesLeft = LISTEN_RETRY_MAX): void {
  const onError = (err: NodeJS.ErrnoException) => {
    server.off("error", onError);
    if (err.code === "EADDRINUSE" && retriesLeft > 0) {
      console.warn(
        `[stagesync-server] port ${PORT} in use, retrying (${retriesLeft})…`,
      );
      setTimeout(() => startListening(retriesLeft - 1), LISTEN_RETRY_MS);
      return;
    }
    console.error(`[stagesync-server] failed to listen on ${PORT}`, err);
    process.exit(1);
  };

  server.once("error", onError);
  server.listen(PORT, () => {
    server.off("error", onError);
    logBuffer.push("info", `listening on http://localhost:${PORT}`);
    console.log(`[stagesync-server] listening on http://localhost:${PORT}`);
    console.log(
      `[stagesync-server] transport WS ws://localhost:${PORT}/ws/transport`,
    );
  });
}

async function main(): Promise<void> {
  try {
    const mig = await migrateVolumeOnBoot(stores);
    if (mig.projectsRewritten > 0) {
      console.log(
        `[stagesync-server] volume migrate: rewrote ${mig.projectsRewritten}/${mig.projectsScanned} project(s); backups: ${mig.backups.length}`,
      );
    }
  } catch (err) {
    console.error("[stagesync-server] volume migrate failed", err);
    process.exit(1);
  }
  startListening();
}

void main();

process.on("SIGINT", () => lifecycle.gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => lifecycle.gracefulShutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  console.error("[CRITICAL UNCAUGHT EXCEPTION]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[CRITICAL UNHANDLED REJECTION]", reason);
});
