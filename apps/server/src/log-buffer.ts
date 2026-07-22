/**
 * In-memory log ring buffer + SSE fan-out (Admin Host panel MVP).
 */

import type { Response } from "express";

export type LogLine = {
  t: number;
  level: string;
  msg: string;
};

export function createLogBuffer(options: { maxLines?: number } = {}) {
  const maxLines = options.maxLines ?? 200;
  const lines: LogLine[] = [];
  const clients = new Set<Response>();

  function push(level: string, msg: string): LogLine {
    const entry: LogLine = {
      t: Date.now(),
      level: String(level).trim().slice(0, 16) || "info",
      msg: String(msg).slice(0, 500),
    };
    lines.push(entry);
    while (lines.length > maxLines) lines.shift();
    const payload = `data: ${JSON.stringify(entry)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch {
        clients.delete(res);
      }
    }
    return entry;
  }

  return {
    push,
    getLines(): LogLine[] {
      return lines.slice();
    },
    clear(): void {
      lines.length = 0;
      const payload = `event: clear\ndata: {}\n\n`;
      for (const res of clients) {
        try {
          res.write(payload);
        } catch {
          clients.delete(res);
        }
      }
    },
    addSseClient(res: Response): () => void {
      clients.add(res);
      for (const line of lines) {
        try {
          res.write(`data: ${JSON.stringify(line)}\n\n`);
        } catch {
          clients.delete(res);
          break;
        }
      }
      return () => {
        clients.delete(res);
      };
    },
    clientCount(): number {
      return clients.size;
    },
  };
}

export type LogBuffer = ReturnType<typeof createLogBuffer>;
