import type { Request, Response } from "express";

function clientIp(req: Request): string {
  return req.socket.remoteAddress ?? "";
}

function isLoopbackAddress(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

/** Restart/shutdown: loopback OK; remote needs ALLOW_REMOTE or HOST_TOKEN. */
export function assertLifecycleAllowed(req: Request, res: Response): boolean {
  if (isLoopbackAddress(clientIp(req))) return true;
  if (process.env.STAGESYNC_ALLOW_REMOTE_LIFECYCLE === "1") return true;

  const expected = process.env.STAGESYNC_HOST_TOKEN?.trim();
  if (expected) {
    const auth = req.header("authorization");
    const bearer =
      auth && auth.toLowerCase().startsWith("bearer ")
        ? auth.slice(7).trim()
        : "";
    const header = req.header("x-stagesync-host-token")?.trim() ?? "";
    if (bearer === expected || header === expected) return true;
  }

  res.status(403).json({
    ok: false,
    error:
      "Restart/shutdown z LAN wymaga STAGESYNC_HOST_TOKEN (Bearer) lub STAGESYNC_ALLOW_REMOTE_LIFECYCLE=1.",
  });
  return false;
}
