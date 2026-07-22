import type { Response } from "express";
import type { ApiErrorDetail } from "@stagesync/shared";
import {
  ConflictError,
  InvalidProjectIdError,
  NotFoundError,
  StorageError,
} from "../storage/index.js";

export function sendError(
  res: Response,
  status: number,
  error: string,
  details?: ApiErrorDetail[],
): void {
  const message = String(error).slice(0, 500);
  res.status(status).json(
    details && details.length > 0
      ? { ok: false, error: message, details }
      : { ok: false, error: message },
  );
}

function zodDetails(err: unknown): {
  message: string;
  details: ApiErrorDetail[];
} | null {
  if (
    !err ||
    typeof err !== "object" ||
    !("name" in err) ||
    (err as { name: string }).name !== "ZodError" ||
    !("issues" in err) ||
    !Array.isArray((err as { issues: unknown }).issues)
  ) {
    return null;
  }
  const issues = (
    err as {
      issues: Array<{
        message: string;
        path: (string | number)[];
        code?: string;
      }>;
    }
  ).issues;
  const details: ApiErrorDetail[] = issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(root)",
    message: issue.message,
    ...(issue.code ? { code: issue.code } : {}),
  }));
  const message = details.map((d) => d.message).join("; ");
  return { message, details };
}

export function handleRouteError(res: Response, err: unknown): void {
  const zod = zodDetails(err);
  if (zod !== null) {
    sendError(res, 400, zod.message, zod.details);
    return;
  }
  if (err instanceof RangeError) {
    sendError(res, 400, err.message);
    return;
  }
  if (err instanceof InvalidProjectIdError) {
    sendError(res, 400, err.message);
    return;
  }
  if (err instanceof NotFoundError) {
    sendError(res, 404, err.message);
    return;
  }
  if (err instanceof ConflictError) {
    sendError(res, 409, err.message);
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
