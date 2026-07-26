/**
 * Conditional Sentry for the Node host. No-op when `SENTRY_DSN` is unset.
 * Does not send PII (tokens, PIN, cookies). Fail-soft on init errors.
 *
 * `@sentry/node` is loaded only when a DSN is set — keeps Console Android
 * (nodejs-mobile, no DSN) free of Sentry / import-in-the-middle boot cost.
 */

type SentryModule = typeof import("@sentry/node");

let initialized = false;
let sentryMod: SentryModule | null = null;

const SENSITIVE_HEADER =
  /^(authorization|cookie|set-cookie|x-stagesync-operator-pin|x-stagesync-pin|x-stagesync-host-token)$/i;

function scrubRequestData(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!data || typeof data !== "object") return data;
  const headers = data.headers;
  if (!headers || typeof headers !== "object") return data;
  const nextHeaders: Record<string, unknown> = {
    ...(headers as Record<string, unknown>),
  };
  for (const key of Object.keys(nextHeaders)) {
    if (SENSITIVE_HEADER.test(key)) {
      nextHeaders[key] = "[Filtered]";
    }
  }
  return { ...data, headers: nextHeaders };
}

/**
 * Initialize Sentry when `SENTRY_DSN` is set. Safe to call multiple times.
 * Returns whether reporting is active.
 */
export async function initServerSentry(): Promise<boolean> {
  if (initialized) return true;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return false;

  try {
    const Sentry = await import("@sentry/node");
    sentryMod = Sentry;
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.request) {
          event.request = scrubRequestData(
            event.request as Record<string, unknown>,
          ) as typeof event.request;
        }
        return event;
      },
    });
    initialized = true;
    console.log("[stagesync-server] Sentry enabled (SENTRY_DSN set)");
    return true;
  } catch (err) {
    console.warn(
      "[stagesync-server] Sentry init failed; continuing without crash reporting",
      err,
    );
    return false;
  }
}

export function isServerSentryEnabled(): boolean {
  return initialized;
}

/** Capture an unexpected error when Sentry is active (no-op otherwise). */
export function captureServerException(error: unknown): void {
  if (!initialized || !sentryMod) return;
  sentryMod.captureException(error);
}
