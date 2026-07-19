import { createApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 4000);

createApp().listen(PORT, () => {
  console.log(`[stagesync-server] listening on http://localhost:${PORT}`);
});
