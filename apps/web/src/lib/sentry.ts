/**
 * Conditional Sentry for the web shell. No-op when `VITE_SENTRY_DSN` is unset.
 * Does not send PII. Fail-soft on init errors.
 */

import * as Sentry from "@sentry/react";

let initialized = false;

/**
 * Initialize Sentry when `VITE_SENTRY_DSN` is set. Safe to call multiple times.
 * Returns whether reporting is active.
 */
export function initWebSentry(): boolean {
  if (initialized) return true;
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return false;

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.request?.headers) {
          const headers = { ...event.request.headers };
          for (const key of Object.keys(headers)) {
            if (
              /^(authorization|cookie|x-stagesync-operator-pin|x-stagesync-pin|x-stagesync-host-token)$/i.test(
                key,
              )
            ) {
              headers[key] = "[Filtered]";
            }
          }
          event.request.headers = headers;
        }
        return event;
      },
    });
    initialized = true;
    return true;
  } catch (err) {
    console.warn(
      "[stagesync-web] Sentry init failed; continuing without crash reporting",
      err,
    );
    return false;
  }
}

export function isWebSentryEnabled(): boolean {
  return initialized;
}

/** Capture an unexpected error when Sentry is active (no-op otherwise). */
export function captureWebException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
