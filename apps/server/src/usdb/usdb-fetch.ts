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

import {
  SEARCH_LIMIT,
  extractUsdbSongId,
  isValidUsdbSongUrl,
  parseUltrastarHeaders,
  parseUsdbSearchHtml,
  parseUsdbTxtFromHtml,
  usdbDetailUrl,
  type UsdbCredentials,
  type UsdbFetchResult,
  type UsdbSearchRow,
} from "./usdb-parser.js";
import {
  UsdbSessionExpiredError,
  assertLoggedInHtml,
  requireUsdbCredentials,
  usdbRequest,
  withUsdbSession,
} from "./usdb-auth.js";

export {
  SEARCH_LIMIT,
  USDB_ORIGIN,
  USDB_URL_RE,
  extractUsdbSongId,
  isValidUsdbSongUrl,
  parseUltrastarHeaders,
  parseUsdbSearchHtml,
  parseUsdbTxtFromHtml,
  usdbDetailUrl,
  type UsdbCredentials,
  type UsdbFetchResult,
  type UsdbSearchRow,
} from "./usdb-parser.js";

export {
  DEFAULT_HEADERS,
  MSG_INVALID_CREDENTIALS,
  MSG_NO_SESSION,
  MSG_RATE_LIMITED,
  MSG_UNREACHABLE,
  UsdbAuthError,
  UsdbSessionExpiredError,
  clearUsdbSessionCache,
  loginUsdb,
  readUsdbCredentialsFromEnv,
  requireUsdbCredentials,
  type UsdbAuthErrorCode,
} from "./usdb-auth.js";

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
      result = await usdbRequest(`/index.php?link=gettxt&id=${id}`, {
        method: "POST",
        cookie,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "wd=1",
      });
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
