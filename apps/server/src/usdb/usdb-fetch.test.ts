import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearUsdbSessionCache,
  extractUsdbSongId,
  fetchUsdbSong,
  isValidUsdbSongUrl,
  loginUsdb,
  parseUltrastarHeaders,
  parseUsdbSearchHtml,
  parseUsdbTxtFromHtml,
  searchUsdbSongs,
  UsdbAuthError,
  usdbDetailUrl,
} from "./usdb-fetch.js";

const CREDS = { user: "alice", pass: "secret" };

const SAMPLE_LIST_HTML = `
<html><body>
<table>
<tr class="list_head"><td>Artist</td><td>Title</td></tr>
<tr>
  <td onclick="show_detail(27563)">Toto</td>
  <td>Africa</td>
  <td>SingStar</td>
  <td>Nein</td>
  <td>English</td>
  <td><img src="images/star.png"><img src="images/star.png"><img src="images/half_star.png"></td>
  <td>1200</td>
</tr>
<tr>
  <td onclick="show_detail(99)">Artist &amp; Co</td>
  <td>Song &quot;X&quot;</td>
  <td></td>
  <td>Ja</td>
  <td>Polish</td>
  <td><img src="images/star.png"></td>
  <td>10</td>
</tr>
</table>
</body></html>
`;

/** Live USDB shape: unclosed list_head + data-songid + “There are N results…”. */
const LIVE_LIST_HTML = `
<html><body>
<br>There are  2  results on  1 page(s)<br><br>
<table border="0" width="100%">
<tr class="list_head"><td>Artist</td><td>Title</td><td>Genre</td><td>Year</td>
<td>Edition</td><td>Golden Notes</td><td>Language</td><td>Creator</td>
<td>Rating</td><td>Views</td><td>&nbsp;</td>
<tr class="list_tr1" data-songid="31027" data-lastchange="1">
  <td onclick="show_detail(31027)">E-Type feat. Nana Hedin</td>
  <td onclick="show_detail(31027)"><a href="?link=detail&id=31027">Africa</td>
  <td onclick="show_detail(31027)">Eurodance</td>
  <td onclick="show_detail(31027)">2002</td>
  <td onclick="show_detail(31027)"></td>
  <td onclick="show_detail(31027)">Yes</td>
  <td onclick="show_detail(31027)">English</td>
  <td onclick="show_detail(31027)">flommymon</td>
  <td onclick="show_detail(31027)"><img src="images/star2.png"> <img src="images/star2.png"></td>
  <td onclick="show_detail(31027)">179</td>
  <td></td>
</tr>
<tr class="list_tr2" data-songid="25399">
  <td onclick="show_detail(25399)">Weezer</td>
  <td onclick="show_detail(25399)">Africa</td>
  <td onclick="show_detail(25399)">Pop</td>
  <td onclick="show_detail(25399)">2018</td>
  <td onclick="show_detail(25399)"></td>
  <td onclick="show_detail(25399)">Yes</td>
  <td onclick="show_detail(25399)">English</td>
  <td onclick="show_detail(25399)">zachpn</td>
  <td onclick="show_detail(25399)"><img src="images/star2.png"></td>
  <td onclick="show_detail(25399)">392</td>
  <td></td>
</tr>
</tr>
</table>
</body></html>
`;

const SAMPLE_TXT_PAGE = `
<html><body>
<textarea name="txt">#TITLE:Africa
#ARTIST:Toto
#BPM:320
#GAP:0
: 0 4 0 Hi
E
</textarea>
</body></html>
`;

const GUEST_HTML =
  `<html><body><span class='gen'>Welcome, Please login ...</span>` +
  `You are not logged in. Login to use this function.</body></html>`;

/** Real USDB wording for bad password (login POST). */
const LOGIN_INVALID_HTML =
  `<html><body><span class='gen'>Welcome, Please login ...</span>` +
  `Login or Password invalid, please try again.<form method="post" action="">` +
  `</form></body></html>`;

/**
 * Real successful login POST shape from usdb.animux.de: welcome still says
 * "Please login" and there is NO Logout chrome — only the PHPSESSID is auth'd.
 */
const LOGIN_POST_OK_HTML =
  `<html><body><span class='gen'>Welcome, Please login ...</span>` +
  `<form method="post" action=""><input name="user"></form></body></html>`;

/** After login, browse / list show Logout (and no "You are not logged in"). */
const LOGGED_IN_BROWSE_HTML =
  `<html><body><a href=?link=logout class='Linkz'>Logout</a>` +
  `<span class='gen'>Welcome, alice</span></body></html>`;

function jsonResponse(html: string, setCookie?: string): Response {
  const headers = new Headers({ "content-type": "text/html" });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(html, { status: 200, headers });
}

describe("usdb-fetch parsers", () => {
  it("isValidUsdbSongUrl accepts animux detail links", () => {
    expect(
      isValidUsdbSongUrl("https://usdb.animux.de/?link=detail&id=27563"),
    ).toBe(true);
    expect(
      isValidUsdbSongUrl(
        "https://www.usdb.animux.de/index.php?link=detail&id=1",
      ),
    ).toBe(true);
    expect(isValidUsdbSongUrl("https://example.com/?id=1")).toBe(false);
  });

  it("extractUsdbSongId from url or bare id", () => {
    expect(
      extractUsdbSongId("https://usdb.animux.de/?link=detail&id=27563"),
    ).toBe(27563);
    expect(extractUsdbSongId("27563")).toBe(27563);
    expect(extractUsdbSongId("nope")).toBeNull();
  });

  it("usdbDetailUrl builds canonical link", () => {
    expect(usdbDetailUrl(12)).toBe("https://usdb.animux.de/?link=detail&id=12");
  });

  it("parseUsdbSearchHtml extracts songs", () => {
    const rows = parseUsdbSearchHtml(SAMPLE_LIST_HTML);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 27563,
      artist: "Toto",
      title: "Africa",
      language: "English",
      rating: 2.5,
    });
    expect(rows[0]!.url).toContain("id=27563");
    expect(rows[1]!.artist).toBe("Artist & Co");
    expect(rows[1]!.title).toBe('Song "X"');
  });

  it("parseUsdbSearchHtml handles live unclosed list_head + data-songid", () => {
    const rows = parseUsdbSearchHtml(LIVE_LIST_HTML);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 31027,
      artist: "E-Type feat. Nana Hedin",
      title: "Africa",
      language: "English",
      rating: 2,
    });
    expect(rows[1]).toMatchObject({
      id: 25399,
      artist: "Weezer",
      title: "Africa",
      language: "English",
    });
    expect(rows.some((r) => /results?\s+on/i.test(r.artist ?? ""))).toBe(false);
    expect(rows.some((r) => r.title === "Title")).toBe(false);
  });

  it("parseUsdbTxtFromHtml reads textarea UltraStar body", () => {
    const txt = parseUsdbTxtFromHtml(SAMPLE_TXT_PAGE);
    expect(txt).toContain("#TITLE:Africa");
    expect(txt).toContain(": 0 4 0 Hi");
  });

  it("parseUltrastarHeaders reads TITLE/ARTIST/LANGUAGE", () => {
    expect(
      parseUltrastarHeaders(
        "#TITLE:A\n#ARTIST:B\n#LANGUAGE:Polish\n: 0 1 0 x\n",
      ),
    ).toEqual({ title: "A", artist: "B", language: "Polish" });
  });

  it("parseUsdbSearchHtml returns empty for HTML without songs", () => {
    expect(
      parseUsdbSearchHtml("<html><body>There are 0 results</body></html>"),
    ).toEqual([]);
    expect(parseUsdbSearchHtml("")).toEqual([]);
  });

  it("parseUsdbTxtFromHtml returns null when textarea missing", () => {
    expect(parseUsdbTxtFromHtml("<html><body>no txt</body></html>")).toBeNull();
  });
});

describe("usdb-fetch session / login", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    clearUsdbSessionCache();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    clearUsdbSessionCache();
    vi.unstubAllGlobals();
  });

  it("rejects login when USDB returns Login or Password invalid", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_INVALID_HTML, "PHPSESSID=bad; Path=/"),
    );

    await expect(loginUsdb(CREDS)).rejects.toMatchObject({
      name: "UsdbAuthError",
      code: "invalid_credentials",
    });
    expect(String(fetchMock.mock.calls[0]![0])).toContain("link=home");
  });

  it("rejects invalid credentials with actionable Polish Konto USDB copy", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_INVALID_HTML, "PHPSESSID=bad; Path=/"),
    );

    try {
      await loginUsdb(CREDS);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(UsdbAuthError);
      expect((err as UsdbAuthError).code).toBe("invalid_credentials");
      expect((err as Error).message).toMatch(/Konto USDB|usdb\.animux\.de/i);
    }
  });

  it("accepts login when POST still shows Please login but browse has Logout", async () => {
    // Live USDB: successful login POST keeps guest welcome chrome.
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_POST_OK_HTML, "PHPSESSID=oksession; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGGED_IN_BROWSE_HTML, "PHPSESSID=oksession; Path=/"),
    );

    await expect(loginUsdb(CREDS)).resolves.toContain("PHPSESSID=oksession");
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain("link=home");
    expect(urls[1]).toContain("link=browse");
  });

  it("rejects when login POST looks empty-invalid but browse stays guest", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_POST_OK_HTML, "PHPSESSID=guest; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse(GUEST_HTML));

    await expect(loginUsdb(CREDS)).rejects.toMatchObject({
      code: "invalid_credentials",
    });
  });

  it("re-logins and retries search after expired session cookie", async () => {
    // 1) ensureSession → login POST OK
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_POST_OK_HTML, "PHPSESSID=stale; Path=/"),
    );
    // 2) login verify browse OK
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGGED_IN_BROWSE_HTML, "PHPSESSID=stale; Path=/"),
    );
    // 3) search with stale cookie → guest
    fetchMock.mockResolvedValueOnce(jsonResponse(GUEST_HTML));
    // 4) force re-login POST
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_POST_OK_HTML, "PHPSESSID=fresh; Path=/"),
    );
    // 5) re-login verify browse
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGGED_IN_BROWSE_HTML, "PHPSESSID=fresh; Path=/"),
    );
    // 6) search retry → results
    fetchMock.mockResolvedValueOnce(jsonResponse(SAMPLE_LIST_HTML));

    const rows = await searchUsdbSongs("Africa", "Toto", {
      credentials: CREDS,
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(27563);

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.filter((u) => u.includes("link=home"))).toHaveLength(2);
    expect(urls.filter((u) => u.includes("link=list"))).toHaveLength(2);
    expect(urls.filter((u) => u.includes("link=browse"))).toHaveLength(2);

    const retryInit = fetchMock.mock.calls[5]![1] as RequestInit;
    const retryHeaders = retryInit.headers as Record<string, string>;
    expect(retryHeaders.cookie).toContain("PHPSESSID=fresh");
  });

  it("surfaces clear error when re-login fails after session expiry", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_POST_OK_HTML, "PHPSESSID=first; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGGED_IN_BROWSE_HTML, "PHPSESSID=first; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse(SAMPLE_LIST_HTML));
    await searchUsdbSongs("Africa", undefined, { credentials: CREDS });

    fetchMock.mockReset();
    // Cached cookie used — guest HTML
    fetchMock.mockResolvedValueOnce(jsonResponse(GUEST_HTML));
    // Re-login with bad password HTML (real USDB wording)
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_INVALID_HTML, "PHPSESSID=nope; Path=/"),
    );

    await expect(
      searchUsdbSongs("Africa", undefined, { credentials: CREDS }),
    ).rejects.toThrow(/Nieprawidłowe dane logowania USDB/);
  });

  it("surfaces renew failure when session stays guest after successful re-login", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_POST_OK_HTML, "PHPSESSID=a; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGGED_IN_BROWSE_HTML, "PHPSESSID=a; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse(GUEST_HTML));
    // Re-login verifies OK on browse…
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_POST_OK_HTML, "PHPSESSID=b; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGGED_IN_BROWSE_HTML, "PHPSESSID=b; Path=/"),
    );
    // …but subsequent list is still guest → renew failure
    fetchMock.mockResolvedValueOnce(jsonResponse(GUEST_HTML));

    await expect(
      searchUsdbSongs("Africa", undefined, { credentials: CREDS }),
    ).rejects.toThrow(/odnowić sesji USDB|Konto USDB/);
  });

  it("re-logins and retries fetch after expired session", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_POST_OK_HTML, "PHPSESSID=old; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGGED_IN_BROWSE_HTML, "PHPSESSID=old; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse(GUEST_HTML));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_POST_OK_HTML, "PHPSESSID=new; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGGED_IN_BROWSE_HTML, "PHPSESSID=new; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse(SAMPLE_TXT_PAGE));

    const result = await fetchUsdbSong(
      "https://usdb.animux.de/?link=detail&id=27563",
      { credentials: CREDS },
    );
    expect(result.content).toContain("#TITLE:Africa");
    expect(result.metadata.songId).toBe(27563);
  });

  it("searchUsdbSongs returns [] for empty title without network", async () => {
    await expect(
      searchUsdbSongs("   ", undefined, { credentials: CREDS }),
    ).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("searchUsdbSongs surfaces network failure", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGIN_POST_OK_HTML, "PHPSESSID=net; Path=/"),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse(LOGGED_IN_BROWSE_HTML, "PHPSESSID=net; Path=/"),
    );
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));

    await expect(
      searchUsdbSongs("Africa", undefined, { credentials: CREDS }),
    ).rejects.toThrow(/Błąd wyszukiwania USDB|ECONNRESET/);
  });

  it("loginUsdb surfaces unreachable network errors", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(loginUsdb(CREDS)).rejects.toMatchObject({
      name: "UsdbAuthError",
      code: "unreachable",
    });
  });
});
