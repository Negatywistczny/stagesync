import { USDB_ORIGIN, type UsdbCredentials } from "./usdb-parser.js";

const FETCH_TIMEOUT_MS = 20_000;

export class UsdbSessionExpiredError extends Error {
  constructor(
    message = "Sesja USDB wygasła — zaloguj ponownie (sprawdź dane konta).",
  ) {
    super(message);
    this.name = "UsdbSessionExpiredError";
  }
}

export type UsdbAuthErrorCode =
  "invalid_credentials" | "unreachable" | "rate_limited" | "no_session";

export class UsdbAuthError extends Error {
  readonly code: UsdbAuthErrorCode;

  constructor(code: UsdbAuthErrorCode, message: string) {
    super(message);
    this.name = "UsdbAuthError";
    this.code = code;
  }
}

export const MSG_INVALID_CREDENTIALS =
  "Nieprawidłowe dane logowania USDB. Sprawdź użytkownika i hasło w Import UltraStar → Konto USDB (konto na usdb.animux.de).";
export const MSG_RATE_LIMITED =
  "USDB chwilowo ogranicza logowanie (zbyt wiele prób). Poczekaj chwilę i spróbuj ponownie w Konto USDB.";
export const MSG_NO_SESSION =
  "USDB nie zwrócił sesji po logowaniu. Sprawdź połączenie z usdb.animux.de albo spróbuj ponownie.";
export const MSG_UNREACHABLE =
  "Nie udało się połączyć z USDB (usdb.animux.de). Sprawdź sieć hosta i spróbuj ponownie.";

const NOT_LOGGED_IN_RE =
  /You are not logged in\.?\s*Login to use this function|nicht eingeloggt|nie jesteś zalogowany/i;

const LOGIN_INVALID_NEEDLE = "Login or Password invalid, please try again.";

const LOGIN_RATE_LIMIT_RE =
  /too many (?:requests|attempts|logins)|rate limit|captcha|try again later|vorübergehend/i;

const LOGGED_IN_HINT_RE =
  /link=logout|\bLogout\b|\bLog out\b|Ausloggen|Wyloguj/i;

export const DEFAULT_HEADERS: Record<string, string> = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9,pl;q=0.8",
};

export function readUsdbCredentialsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): UsdbCredentials | null {
  const user = env.STAGESYNC_USDB_USER?.trim() ?? "";
  const pass = env.STAGESYNC_USDB_PASS?.trim() ?? "";
  if (!user || !pass) return null;
  return { user, pass };
}

export function requireUsdbCredentials(
  env: NodeJS.ProcessEnv = process.env,
): UsdbCredentials {
  const creds = readUsdbCredentialsFromEnv(env);
  if (!creds) {
    throw new Error(
      "Brak konta USDB. Ustaw je w Import UltraStar → Konto USDB albo w Ustawieniach serwera (konto na usdb.animux.de).",
    );
  }
  return creds;
}

export function authKeyOf(creds: UsdbCredentials): string {
  return `${creds.user}\0${creds.pass}`;
}

export function assertLoggedInHtml(html: string): void {
  if (NOT_LOGGED_IN_RE.test(html)) {
    throw new UsdbSessionExpiredError();
  }
}

export function extractCookieHeader(response: Response): string | null {
  const anyHeaders = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = anyHeaders.getSetCookie?.();
  if (Array.isArray(setCookies) && setCookies.length > 0) {
    return setCookies.map((c) => c.split(";", 1)[0]!).join("; ");
  }
  const combined = response.headers.get("set-cookie");
  if (!combined) return null;
  const matches = combined.matchAll(/([^=;,\s]+=[^;]+)(?:;|$)/g);
  const byName = new Map<string, string>();
  for (const m of matches) {
    const pair = m[1]!;
    byName.set(pair.split("=", 1)[0]!, pair);
  }
  return byName.size ? Array.from(byName.values()).join("; ") : null;
}

export function mergeCookieHeader(
  existing: string | null | undefined,
  fromResponse: string | null | undefined,
): string | null {
  if (!fromResponse) return existing?.trim() || null;
  if (!existing?.trim()) return fromResponse;
  const byName = new Map<string, string>();
  for (const part of `${existing}; ${fromResponse}`.split(";")) {
    const pair = part.trim();
    if (!pair || !pair.includes("=")) continue;
    byName.set(pair.split("=", 1)[0]!, pair);
  }
  return byName.size ? Array.from(byName.values()).join("; ") : null;
}

export async function usdbRequest(
  pathAndQuery: string,
  init: RequestInit & { cookie?: string } = {},
): Promise<{
  status: number;
  html: string;
  cookieFromResponse: string | null;
}> {
  const { cookie, headers: initHeaders, ...rest } = init;
  const headers: Record<string, string> = {
    ...DEFAULT_HEADERS,
    ...(initHeaders as Record<string, string> | undefined),
  };
  if (cookie) headers.cookie = cookie;

  const response = await fetch(`${USDB_ORIGIN}${pathAndQuery}`, {
    ...rest,
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  return {
    status: response.status,
    html: await response.text(),
    cookieFromResponse: extractCookieHeader(response),
  };
}

type SessionState = {
  cookie: string;
  authKey: string;
};

let sessionCache: SessionState | null = null;

export async function loginUsdb(creds: UsdbCredentials): Promise<string> {
  const user = creds.user.trim();
  const pass = creds.pass.trim();
  if (!user || !pass) {
    throw new UsdbAuthError("invalid_credentials", MSG_INVALID_CREDENTIALS);
  }

  const body = new URLSearchParams({
    user,
    pass,
    login: "Login",
  });

  let result: {
    status: number;
    html: string;
    cookieFromResponse: string | null;
  };
  try {
    result = await usdbRequest("/?link=home", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        referer: `${USDB_ORIGIN}/?link=home`,
      },
      body: body.toString(),
    });
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      throw new UsdbAuthError(
        "unreachable",
        "Przekroczono limit czasu logowania do USDB.",
      );
    }
    throw new UsdbAuthError(
      "unreachable",
      `${MSG_UNREACHABLE} (${e.message || String(err)})`,
    );
  }

  if (result.status >= 400) {
    throw new UsdbAuthError(
      "unreachable",
      `Logowanie USDB nieudane (HTTP ${result.status}).`,
    );
  }
  if (result.html.includes(LOGIN_INVALID_NEEDLE)) {
    throw new UsdbAuthError("invalid_credentials", MSG_INVALID_CREDENTIALS);
  }
  if (LOGIN_RATE_LIMIT_RE.test(result.html)) {
    throw new UsdbAuthError("rate_limited", MSG_RATE_LIMITED);
  }

  let cookie = result.cookieFromResponse;
  if (!cookie) {
    throw new UsdbAuthError("no_session", MSG_NO_SESSION);
  }

  let verify: {
    status: number;
    html: string;
    cookieFromResponse: string | null;
  };
  try {
    verify = await usdbRequest("/?link=browse", {
      method: "GET",
      cookie,
      headers: { referer: `${USDB_ORIGIN}/?link=home` },
    });
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      throw new UsdbAuthError(
        "unreachable",
        "Przekroczono limit czasu weryfikacji sesji USDB.",
      );
    }
    throw new UsdbAuthError(
      "unreachable",
      `${MSG_UNREACHABLE} (${e.message || String(err)})`,
    );
  }

  cookie = mergeCookieHeader(cookie, verify.cookieFromResponse) ?? cookie;

  if (
    NOT_LOGGED_IN_RE.test(verify.html) ||
    !LOGGED_IN_HINT_RE.test(verify.html)
  ) {
    throw new UsdbAuthError("invalid_credentials", MSG_INVALID_CREDENTIALS);
  }

  return cookie;
}

export async function ensureSession(
  creds: UsdbCredentials,
  force = false,
): Promise<string> {
  const key = authKeyOf(creds);
  if (!force && sessionCache && sessionCache.authKey === key) {
    return sessionCache.cookie;
  }
  const cookie = await loginUsdb(creds);
  sessionCache = { cookie, authKey: key };
  return cookie;
}

export function clearUsdbSessionCache(): void {
  sessionCache = null;
}

export async function withUsdbSession<T>(
  creds: UsdbCredentials,
  run: (cookie: string) => Promise<T>,
): Promise<T> {
  let cookie = await ensureSession(creds);
  try {
    return await run(cookie);
  } catch (err) {
    if (!(err instanceof UsdbSessionExpiredError)) throw err;
    clearUsdbSessionCache();
    cookie = await ensureSession(creds, true);
    try {
      return await run(cookie);
    } catch (retryErr) {
      if (retryErr instanceof UsdbSessionExpiredError) {
        clearUsdbSessionCache();
        throw new Error(
          "Nie udało się odnowić sesji USDB — sprawdź dane konta (Import UltraStar → Konto USDB).",
          { cause: retryErr },
        );
      }
      throw retryErr;
    }
  }
}
