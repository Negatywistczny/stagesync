/**
 * Fetch UltraStar / USDX song text from USDB (usdb.animux.de).
 * Same host-proxy pattern as Ultimate Guitar — CORS / session stay on the server.
 *
 * Requires operator credentials on the host (`STAGESYNC_USDB_USER` +
 * `STAGESYNC_USDB_PASS`): set via Import UltraStar → Konto USDB, Ustawienia
 * serwera, or env bootstrap. Search and .txt download need a logged-in session.
 *
 * Session cookies live only in memory. On expiry / kick (USDB is single-session),
 * we re-login with stored credentials and retry the request once.
 */

import { decodeHtmlEntities } from "@stagesync/shared";
import type { UltrastarSongMetadata } from "@stagesync/shared";

const USDB_ORIGIN = "https://usdb.animux.de";
const FETCH_TIMEOUT_MS = 20_000;
const SEARCH_LIMIT = 25;

const USDB_URL_RE =
  /^https?:\/\/(?:www\.)?usdb\.animux\.de\/(?:index\.php)?(?:\?|#|$)/i;

/**
 * USDB HTML when a private page needs auth (search / gettxt / browse).
 * Do NOT use bare "Please login" for login POST success — the login response
 * still shows "Welcome, Please login ..." even with a valid session cookie
 * (verified against live usdb.animux.de; usdb_syncer only checks LOGIN_INVALID).
 */
const NOT_LOGGED_IN_RE =
  /You are not logged in\.?\s*Login to use this function|nicht eingeloggt|nie jesteś zalogowany/i;

/**
 * Exact USDB login failure copy (usdb_syncer `UsdbStrings.LOGIN_INVALID`).
 * Bare "Login invalid" does not match — real text is "Login or Password invalid…".
 */
const LOGIN_INVALID_NEEDLE = "Login or Password invalid, please try again.";

/** Soft rate-limit / challenge hints (best-effort; USDB copy varies). */
const LOGIN_RATE_LIMIT_RE =
  /too many (?:requests|attempts|logins)|rate limit|captcha|try again later|vorübergehend/i;

/** Nav / chrome after a successful session (browse / list, not login POST). */
const LOGGED_IN_HINT_RE =
  /link=logout|\bLogout\b|\bLog out\b|Ausloggen|Wyloguj/i;

export type UsdbCredentials = {
  user: string;
  pass: string;
};

export type UsdbSearchRow = {
  id: number;
  title: string | null;
  artist: string | null;
  language: string | null;
  edition: string | null;
  rating: number | null;
  url: string;
};

export type UsdbFetchResult = {
  content: string;
  metadata: UltrastarSongMetadata;
};

/** Thrown when USDB HTML indicates the session cookie is not authenticated. */
export class UsdbSessionExpiredError extends Error {
  constructor(
    message = "Sesja USDB wygasła — zaloguj ponownie (sprawdź dane konta).",
  ) {
    super(message);
    this.name = "UsdbSessionExpiredError";
  }
}

export type UsdbAuthErrorCode =
  | "invalid_credentials"
  | "unreachable"
  | "rate_limited"
  | "no_session";

/** Login / account-test failures with a stable code for HTTP + UI copy. */
export class UsdbAuthError extends Error {
  readonly code: UsdbAuthErrorCode;

  constructor(code: UsdbAuthErrorCode, message: string) {
    super(message);
    this.name = "UsdbAuthError";
    this.code = code;
  }
}

const MSG_INVALID_CREDENTIALS =
  "Nieprawidłowe dane logowania USDB. Sprawdź użytkownika i hasło w Import UltraStar → Konto USDB (konto na usdb.animux.de).";
const MSG_RATE_LIMITED =
  "USDB chwilowo ogranicza logowanie (zbyt wiele prób). Poczekaj chwilę i spróbuj ponownie w Konto USDB.";
const MSG_NO_SESSION =
  "USDB nie zwrócił sesji po logowaniu. Sprawdź połączenie z usdb.animux.de albo spróbuj ponownie.";
const MSG_UNREACHABLE =
  "Nie udało się połączyć z USDB (usdb.animux.de). Sprawdź sieć hosta i spróbuj ponownie.";

type SessionState = {
  cookie: string;
  authKey: string;
};

let sessionCache: SessionState | null = null;

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

export function isValidUsdbSongUrl(url: string): boolean {
  return typeof url === "string" && USDB_URL_RE.test(url.trim());
}

export function extractUsdbSongId(urlOrId: string): number | null {
  const trimmed = String(urlOrId || "").trim();
  if (/^\d{1,8}$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  const match =
    trimmed.match(/[?&#]id=(\d+)/i) ||
    trimmed.match(/show_detail\((\d+)\)/i) ||
    trimmed.match(/\/(\d{1,8})(?:\/|$|\?)/);
  if (!match) return null;
  const id = Number.parseInt(match[1]!, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function usdbDetailUrl(id: number): string {
  return `${USDB_ORIGIN}/?link=detail&id=${id}`;
}

function stripTags(html: string): string {
  let cleaned = String(html || "");
  let prev: string;
  do {
    prev = cleaned;
    cleaned = cleaned
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "");
  } while (cleaned !== prev);

  return decodeHtmlEntities(
    cleaned
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function countStars(cellHtml: string): number | null {
  const half = (cellHtml.match(/half_star\.png/gi) || []).length;
  // USDB uses star.png / half_star.png (older) and star2.png (current list).
  const star2 = (cellHtml.match(/star2\.png/gi) || []).length;
  // `half_star.png` also contains the substring `star.png` — subtract halves.
  const starLike = (cellHtml.match(/star\.png/gi) || []).length;
  const full = Math.max(0, starLike - half) + star2;
  if (!full && !half) return null;
  return full + half * 0.5;
}

function isBogusListLabel(text: string | null): boolean {
  if (!text) return true;
  const t = text.trim();
  if (!t) return true;
  if (/^artist$/i.test(t) || /^title$/i.test(t)) return true;
  // Unclosed <tr class="list_head"> can swallow the “There are N results…” blurb.
  if (/\bresults?\s+on\s+\d+\s+page/i.test(t)) return true;
  return false;
}

/**
 * Map list `<td>` cells → fields. Live USDB columns (2024+):
 * Artist, Title, Genre, Year, Edition, Golden, Language, Creator, Rating, Views.
 * Older / compact fixtures: Artist, Title, Edition, Golden, Language, …
 */
function metaFromListCells(cells: string[]): {
  artist: string | null;
  title: string | null;
  edition: string | null;
  language: string | null;
  rating: number | null;
} {
  const artist = stripTags(cells[0]!) || null;
  const title = stripTags(cells[1]!) || null;
  if (cells.length >= 10) {
    return {
      artist,
      title,
      edition: stripTags(cells[4]!) || null,
      language: stripTags(cells[6]!) || null,
      rating: countStars(
        cells.find((c) => /star2?\.png|half_star\.png/i.test(c)) ?? "",
      ),
    };
  }
  return {
    artist,
    title,
    edition: cells[2] ? stripTags(cells[2]) || null : null,
    language: cells.length >= 5 ? stripTags(cells[4]!) || null : null,
    rating: countStars(
      cells.find((c) => /star2?\.png|half_star\.png/i.test(c)) ?? "",
    ),
  };
}

/**
 * Parse USDB song list HTML (`?link=list`) into search rows.
 * Exported for unit tests (no network).
 *
 * USDB leaves `<tr class="list_head">` unclosed before data rows, so a naive
 * `<tr>…</tr>` regex merges the results blurb + header + first song. Prefer
 * `data-songid` rows (current markup).
 */
export function parseUsdbSearchHtml(html: string): UsdbSearchRow[] {
  const rows: UsdbSearchRow[] = [];
  const seen = new Set<number>();

  const pushFromInner = (id: number, rowInner: string) => {
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return;
    const cells = [...rowInner.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (m) => m[1] ?? "",
    );
    if (cells.length < 2) return;
    const meta = metaFromListCells(cells);
    if (isBogusListLabel(meta.artist) || isBogusListLabel(meta.title)) return;
    seen.add(id);
    rows.push({
      id,
      title: meta.title,
      artist: meta.artist,
      language: meta.language,
      edition: meta.edition,
      rating: meta.rating,
      url: usdbDetailUrl(id),
    });
  };

  for (const trMatch of html.matchAll(
    /<tr\b[^>]*\bdata-songid=["']?(\d+)["']?[^>]*>([\s\S]*?)<\/tr>/gi,
  )) {
    pushFromInner(Number.parseInt(trMatch[1]!, 10), trMatch[2] ?? "");
    if (rows.length >= SEARCH_LIMIT) return rows;
  }

  if (rows.length > 0) return rows;

  // Legacy fixtures without data-songid (closed header rows).
  for (const trMatch of html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)) {
    const attrs = trMatch[1] ?? "";
    if (/list_head/i.test(attrs)) continue;
    const rowInner = trMatch[2] ?? "";
    const idMatch = rowInner.match(/show_detail\((\d+)\)/i);
    if (!idMatch) continue;
    pushFromInner(Number.parseInt(idMatch[1]!, 10), rowInner);
    if (rows.length >= SEARCH_LIMIT) break;
  }
  return rows;
}

/**
 * Extract UltraStar `.txt` body from USDB gettxt / editsongs HTML.
 */
export function parseUsdbTxtFromHtml(html: string): string | null {
  const match = html.match(/<textarea\b[^>]*>([\s\S]*?)<\/textarea>/i);
  if (!match) return null;
  const raw = decodeHtmlEntities(match[1] ?? "");
  // USDB may wrap with leading whitespace; keep UltraStar newlines.
  return raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim()
    ? raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n")
    : null;
}

export function parseUltrastarHeaders(content: string): {
  title: string | null;
  artist: string | null;
  language: string | null;
} {
  let title: string | null = null;
  let artist: string | null = null;
  let language: string | null = null;
  for (const line of content.split("\n")) {
    const m = line.match(/^#(TITLE|ARTIST|LANGUAGE)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1]!.toUpperCase();
    const value = m[2]!.trim() || null;
    if (key === "TITLE") title = value;
    else if (key === "ARTIST") artist = value;
    else if (key === "LANGUAGE") language = value;
  }
  return { title, artist, language };
}

function authKeyOf(creds: UsdbCredentials): string {
  return `${creds.user}\0${creds.pass}`;
}

function assertLoggedInHtml(html: string): void {
  if (NOT_LOGGED_IN_RE.test(html)) {
    throw new UsdbSessionExpiredError();
  }
}

function extractCookieHeader(response: Response): string | null {
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

const DEFAULT_HEADERS: Record<string, string> = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9,pl;q=0.8",
};

async function usdbRequest(
  pathAndQuery: string,
  init: RequestInit & { cookie?: string } = {},
): Promise<{ status: number; html: string; cookieFromResponse: string | null }> {
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

function mergeCookieHeader(
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
    // Same endpoint + fields as usdb_syncer / sidebar form (POST to home).
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

  // Login POST HTML still shows "Welcome, Please login ..." without Logout —
  // do not treat that as failure. Cookie proves the attempt; verify on browse.
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

  if (NOT_LOGGED_IN_RE.test(verify.html) || !LOGGED_IN_HINT_RE.test(verify.html)) {
    throw new UsdbAuthError("invalid_credentials", MSG_INVALID_CREDENTIALS);
  }

  return cookie;
}

async function ensureSession(
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

/** Test helper — clears cached USDB session. */
export function clearUsdbSessionCache(): void {
  sessionCache = null;
}

/**
 * Run a USDB request under a session cookie. On session expiry, re-login with
 * stored credentials and retry once. Auth / network failures from re-login
 * surface as-is (not as a cryptic "session expired").
 */
async function withUsdbSession<T>(
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

export async function searchUsdbSongs(
  title: string,
  artist?: string,
  options: { credentials?: UsdbCredentials } = {},
): Promise<UsdbSearchRow[]> {
  const q = String(title || "").trim();
  if (!q) return [];

  const creds = options.credentials ?? requireUsdbCredentials();

  return withUsdbSession(creds, async (cookie) => {
    const form = new URLSearchParams({
      interpret: artist?.trim() ?? "",
      title: q,
      edition: "",
      language: "",
      genre: "",
      order: "rating",
      ud: "desc",
      limit: String(SEARCH_LIMIT),
      start: "0",
    });

    let result: { status: number; html: string };
    try {
      result = await usdbRequest("/?link=list", {
        method: "POST",
        cookie,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (e.name === "TimeoutError" || e.name === "AbortError") {
        throw new Error("Przekroczono limit czasu wyszukiwania USDB.", {
          cause: err,
        });
      }
      throw new Error(`Błąd wyszukiwania USDB: ${e.message || String(err)}`, {
        cause: err,
      });
    }

    assertLoggedInHtml(result.html);
    return parseUsdbSearchHtml(result.html);
  });
}

export async function fetchUsdbSong(
  url: string,
  options: { credentials?: UsdbCredentials } = {},
): Promise<UsdbFetchResult> {
  const trimmed = String(url || "").trim();
  const bareId = /^\d{1,8}$/.test(trimmed);
  const id = extractUsdbSongId(trimmed);

  if (id == null || (!bareId && !isValidUsdbSongUrl(trimmed))) {
    throw new Error(
      "Nieprawidłowy URL. Wymagany link USDB (?link=detail&id=…) lub numer utworu.",
    );
  }

  const creds = options.credentials ?? requireUsdbCredentials();
  const detailUrl = usdbDetailUrl(id);

  return withUsdbSession(creds, async (cookie) => {
    let result: { status: number; html: string };
    try {
      result = await usdbRequest(
        `/index.php?link=gettxt&id=${id}`,
        {
          method: "POST",
          cookie,
          headers: {
            "content-type": "application/x-www-form-urlencoded",
          },
          body: "wd=1",
        },
      );
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (e.name === "TimeoutError" || e.name === "AbortError") {
        throw new Error("Przekroczono limit czasu pobierania z USDB.", {
          cause: err,
        });
      }
      throw new Error(`Błąd pobierania USDB: ${e.message || String(err)}`, {
        cause: err,
      });
    }

    assertLoggedInHtml(result.html);

    let content = parseUsdbTxtFromHtml(result.html);
    if (!content) {
      // Fallback: editsongs page also embeds the txt in a textarea.
      try {
        const fallback = await usdbRequest(`/?link=editsongs&id=${id}`, {
          method: "GET",
          cookie,
        });
        assertLoggedInHtml(fallback.html);
        content = parseUsdbTxtFromHtml(fallback.html);
      } catch (fallbackErr) {
        if (fallbackErr instanceof UsdbSessionExpiredError) throw fallbackErr;
        content = null;
      }
    }

    if (!content?.trim()) {
      throw new Error(
        "Nie znaleziono tekstu UltraStar na USDB (brak textarea / pusty plik).",
      );
    }

    if (!/^#/m.test(content) && !/^[*:FRGE]/m.test(content)) {
      throw new Error("Pobrana treść nie wygląda na plik UltraStar / USDX.");
    }

    const headers = parseUltrastarHeaders(content);
    return {
      content,
      metadata: {
        title: headers.title,
        artist: headers.artist,
        language: headers.language,
        songId: id,
        url: detailUrl,
      },
    };
  });
}
