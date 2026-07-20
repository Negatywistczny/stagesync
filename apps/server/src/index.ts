import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createLifecycle } from "./lifecycle.js";
import { attachTransportWs } from "./transport/ws.js";

const PORT = Number(process.env.PORT ?? 4000);

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

server.listen(PORT, () => {
  logBuffer.push("info", `listening on http://localhost:${PORT}`);
  console.log(`[stagesync-server] listening on http://localhost:${PORT}`);
  console.log(
    `[stagesync-server] transport WS ws://localhost:${PORT}/ws/transport`,
  );
});

process.on("SIGINT", () => lifecycle.gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => lifecycle.gracefulShutdown("SIGTERM"));
