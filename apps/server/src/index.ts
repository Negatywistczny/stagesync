import { createServer } from "node:http";
import { createApp } from "./app.js";
import { attachTransportWs } from "./transport/ws.js";

const PORT = Number(process.env.PORT ?? 4000);

const { app, transport, stageHub } = createApp();
const server = createServer(app);
attachTransportWs(server, transport, stageHub);

server.listen(PORT, () => {
  console.log(`[stagesync-server] listening on http://localhost:${PORT}`);
  console.log(`[stagesync-server] transport WS ws://localhost:${PORT}/ws/transport`);
});
