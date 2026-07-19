import type { Response } from "express";
import { NotFoundError, StorageError } from "../storage/index.js";

export function sendError(
  res: Response,
  status: number,
  error: string,
): void {
  res.status(status).json({ ok: false, error });
}

function zodMessage(err: unknown): string | null {
  if (
    err &&
    typeof err === "object" &&
    "name" in err &&
    (err as { name: string }).name === "ZodError" &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown }).errors)
  ) {
    return (err as { errors: Array<{ message: string }> }).errors
      .map((e) => e.message)
      .join("; ");
  }
  return null;
}

export function handleRouteError(res: Response, err: unknown): void {
  const zodMsg = zodMessage(err);
  if (zodMsg !== null) {
    sendError(res, 400, zodMsg);
    return;
  }
  if (err instanceof NotFoundError) {
    sendError(res, 404, err.message);
    return;
  }
  if (err instanceof StorageError) {
    sendError(res, 500, err.message);
    return;
  }
  sendError(
    res,
    500,
    err instanceof Error ? err.message : "Internal server error",
  );
}
