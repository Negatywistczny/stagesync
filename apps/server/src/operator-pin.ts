/**
 * Optional Host Operator PIN (`STAGESYNC_OPERATOR_PIN`).
 * When set, destructive Admin REST mutations require a matching header.
 * Transport play/pause/stop/seek/loop and MIDI panic stay ungated (show friction).
 * Lifecycle restart/shutdown keep their own HOST_TOKEN guard.
 */

import type { NextFunction, Request, Response } from "express";

export const OPERATOR_PIN_HEADER = "x-stagesync-operator-pin";
/** Spec alias (`X-StageSync-PIN`). */
export const OPERATOR_PIN_HEADER_ALT = "x-stagesync-pin";

export function getConfiguredOperatorPin(): string | null {
  const pin = process.env.STAGESYNC_OPERATOR_PIN?.trim() ?? "";
  return pin.length > 0 ? pin : null;
}

export function isOperatorPinRequired(): boolean {
  return getConfiguredOperatorPin() != null;
}

export function readOperatorPinFromRequest(req: Request): string {
  return (
    req.header(OPERATOR_PIN_HEADER)?.trim() ||
    req.header(OPERATOR_PIN_HEADER_ALT)?.trim() ||
    ""
  );
}

export function assertOperatorPinAllowed(req: Request, res: Response): boolean {
  const expected = getConfiguredOperatorPin();
  if (!expected) return true;
  const provided = readOperatorPinFromRequest(req);
  if (provided === expected) return true;
  res.status(403).json({
    ok: false,
    error: "Wymagany PIN operatora (nagłówek X-Stagesync-Operator-Pin).",
  });
  return false;
}

/** True when PIN matches (or PIN unset). Does not write a response. */
export function verifyOperatorPin(pin: string): boolean {
  const expected = getConfiguredOperatorPin();
  if (!expected) return true;
  return pin.trim() === expected;
}

/**
 * Mutating `/api/*` except show-critical allowlist.
 * Uses `originalUrl` so the check works when mounted at app root.
 */
export function isDestructiveApiRequest(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return false;
  }
  const path = (req.originalUrl ?? req.url).split("?")[0] ?? "";
  if (!path.startsWith("/api/")) return false;

  // Operator-auth status / unlock must stay reachable without a PIN.
  if (
    path === "/api/system/operator-auth" ||
    path.startsWith("/api/system/operator-auth/")
  ) {
    return false;
  }

  // Show-critical: no PIN friction mid-set.
  if (
    method === "POST" &&
    /^\/api\/transport\/(play|pause|stop|seek|loop)\/?$/.test(path)
  ) {
    return false;
  }
  if (method === "POST" && /^\/api\/midi\/panic\/?$/.test(path)) {
    return false;
  }
  // Own lifecycle ACL (HOST_TOKEN / loopback).
  if (
    method === "POST" &&
    /^\/api\/system\/(restart|shutdown)\/?$/.test(path)
  ) {
    return false;
  }

  return true;
}

export function createOperatorPinMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isDestructiveApiRequest(req)) {
      next();
      return;
    }
    if (!assertOperatorPinAllowed(req, res)) return;
    next();
  };
}
