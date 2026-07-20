import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createLifecycle } from "./lifecycle.js";
import { attachTransportWs } from "./transport/ws.js";

const PORT = Number(process.env.PORT ?? 4000);
/** Hot-reload races (tsx watch) often hit EADDRINUSE briefly — retry instead of crashing. */
const LISTEN_RETRY_MS = 250;
const LISTEN_RETRY_MAX = 40;

const server = createServer();
const lifecycle = createLifecycle(server, {
  log: (msg) => console.log(`[stagesync-server] ${msg}`),
});

const { app, transport, stageHub, presence, logBuffer } = createApp({
  lifecycle,
  port: PORT,
});

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

startListening();

process.on("SIGINT", () => lifecycle.gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => lifecycle.gracefulShutdown("SIGTERM"));

