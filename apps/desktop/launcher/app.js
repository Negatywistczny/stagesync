/** @typedef {{ name: string, host: string, port: number, version?: string | null, url: string }} DiscoveredHost */
/** @typedef {{ url: string, label: string }} RecentHost */
/** @typedef {{ hasSidecar: boolean, stagesyncUrl: string | null, expectedVersion: string, lastError?: string | null }} LauncherBootstrap */

const SCAN_MIN_MS = 900;
const LABEL_LOCAL_IDLE = "Uruchom lokalny host";
const LABEL_LOCAL_RETRY = "Ponów uruchomienie";
const VERSION_MISMATCH_PREFIX = "VERSION_MISMATCH:";

const invoke = async (cmd, args = {}) => {
  const core = window.__TAURI__?.core;
  if (!core?.invoke) {
    throw new Error("Brak mostka Tauri — uruchom Launcher w aplikacji StageSync.");
  }
  return core.invoke(cmd, args);
};

const listen = async (event, handler) => {
  const eventApi = window.__TAURI__?.event;
  if (!eventApi?.listen) return () => {};
  return eventApi.listen(event, (e) => handler(e.payload));
};

const el = {
  mainPanel: document.getElementById("mainPanel"),
  btnLocal: document.getElementById("btnLocal"),
  btnLocalClear: document.getElementById("btnLocalClear"),
  localError: document.getElementById("localError"),
  localProgress: document.getElementById("localProgress"),
  localLog: document.getElementById("localLog"),
  localHint: document.getElementById("localHint"),
  btnRefresh: document.getElementById("btnRefresh"),
  hostList: document.getElementById("hostList"),
  manualForm: document.getElementById("manualForm"),
  manualUrl: document.getElementById("manualUrl"),
  manualIdle: document.getElementById("manualIdle"),
  manualBusy: document.getElementById("manualBusy"),
  manualBusyText: document.getElementById("manualBusyText"),
  manualError: document.getElementById("manualError"),
  manualErrorText: document.getElementById("manualErrorText"),
  manualWarn: document.getElementById("manualWarn"),
  manualWarnText: document.getElementById("manualWarnText"),
  btnManualRetry: document.getElementById("btnManualRetry"),
  btnManualBack: document.getElementById("btnManualBack"),
  btnManualForce: document.getElementById("btnManualForce"),
  btnManualWarnBack: document.getElementById("btnManualWarnBack"),
  recentBlock: document.getElementById("recentBlock"),
  recentList: document.getElementById("recentList"),
  appFooter: document.getElementById("appFooter"),
  footerVersion: document.getElementById("footerVersion"),
};

/** @type {LauncherBootstrap | null} */
let bootstrap = null;
let busy = false;
let scanning = false;
/** @type {string | null} */
let lastRemoteUrl = null;
let localHasError = false;

function setBusy(next) {
  busy = next;
  const canLocal = Boolean(bootstrap?.hasSidecar);
  el.btnLocal.disabled = next || !canLocal;
  el.btnRefresh.disabled = next || scanning;
  el.btnLocalClear.disabled = next;
}

function setScanning(next) {
  scanning = next;
  el.btnRefresh.setAttribute("aria-busy", next ? "true" : "false");
  el.btnRefresh.disabled = next || busy;
  el.hostList.classList.toggle("is-scanning", next);
}

/** @returns {{ found: string, expected: string } | null} */
function parseVersionMismatch(raw) {
  const text = String(raw?.message ?? raw ?? "");
  const idx = text.indexOf(VERSION_MISMATCH_PREFIX);
  if (idx < 0) return null;
  const rest = text.slice(idx + VERSION_MISMATCH_PREFIX.length);
  const [found, expected] = rest.split(":");
  if (!found || !expected) return null;
  return { found, expected };
}

/** Friendly copy for connection failures (no raw OS errno dumps). */
function friendlyConnectError(raw, url) {
  const text = String(raw?.message ?? raw ?? "");
  const lower = text.toLowerCase();
  const target = url?.trim() || "hostem";
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("connect failed") ||
    lower.includes("connection refused") ||
    lower.includes("could not connect") ||
    lower.includes("nie można połączyć") ||
    lower.includes("network") ||
    lower.includes("unreachable") ||
    lower.includes("http ≠ 200") ||
    lower.includes("http != 200") ||
    lower.includes("odpowiada na /api/health")
  ) {
    return `Nie można nawiązać połączenia z ${target}. Sprawdź czy urządzenie jest włączone i w tej samej sieci (firewall ~3 s).`;
  }
  if (lower.includes("nieprawidłowy url") || lower.includes("brak hosta")) {
    return "Nieprawidłowy adres. Użyj formatu http://adres:port (np. http://192.168.1.10:4000).";
  }
  const firstLine = text.split("\n")[0]?.trim() || text;
  if (firstLine.length < 160 && !lower.includes("os error") && !lower.includes("errno")) {
    return firstLine;
  }
  return `Nie można nawiązać połączenia z ${target}. Sprawdź czy urządzenie jest włączone i w tej samej sieci.`;
}

function friendlyLocalError(raw) {
  const text = String(raw?.message ?? raw ?? "");
  const lower = text.toLowerCase();
  if (lower.includes("eaddrinuse") || lower.includes("port 4000 jest zajęty")) {
    return "Port 4000 jest zajęty. Zamknij inne instancje StageSync i spróbuj ponownie.";
  }
  if (
    lower.includes("eacces") ||
    lower.includes("permission denied") ||
    lower.includes("access is denied") ||
    lower.includes("brak uprawnień")
  ) {
    return "Brak uprawnień do portu lub katalogu danych. Sprawdź uprawnienia folderu aplikacji i spróbuj ponownie.";
  }
  if (lower.includes("module_not_found") || lower.includes("nie wczytał zależności")) {
    return "Lokalny host nie wczytał zależności. Przeinstaluj StageSync z najnowszego release.";
  }
  if (lower.includes("timeout") || lower.includes("nie odpowiedział")) {
    return "Lokalny host nie odpowiedział w czasie. Spróbuj ponownie.";
  }
  if (lower.includes("zatrzymał się niespodziewanie")) {
    return text.split("\n")[0]?.trim() || text;
  }
  const first = text.split("\n\n— log")[0]?.trim() || text;
  return first.length > 280 ? `${first.slice(0, 277)}…` : first;
}

function friendlyDiscoverError(raw) {
  const text = String(raw?.message ?? raw ?? "");
  const lower = text.toLowerCase();
  if (
    lower.includes("timeout") ||
    lower.includes("przekroczył") ||
    lower.includes("mdns") ||
    lower.includes("network") ||
    lower.includes("unreachable")
  ) {
    return "Nie udało się przeskanować sieci (brak Wi‑Fi, tryb samolotowy lub firewall). Wpisz adres ręcznie.";
  }
  if (text.length < 160) return text;
  return "Nie udało się przeskanować sieci. Wpisz adres ręcznie.";
}

function clearLocalError() {
  localHasError = false;
  el.localError.hidden = true;
  el.localError.textContent = "";
  el.localProgress.hidden = true;
  el.localProgress.textContent = "";
  el.localLog.hidden = true;
  el.localLog.textContent = "";
  el.btnLocalClear.hidden = true;
  el.btnLocal.textContent = LABEL_LOCAL_IDLE;
}

function showLocalProgress(message) {
  localHasError = false;
  el.localError.hidden = true;
  el.localError.textContent = "";
  el.btnLocalClear.hidden = true;
  el.localLog.hidden = true;
  el.localProgress.hidden = false;
  el.localProgress.textContent = message;
  el.btnLocal.textContent = LABEL_LOCAL_IDLE;
}

function showLocalError(message, log) {
  localHasError = true;
  el.localProgress.hidden = true;
  el.localProgress.textContent = "";
  el.localError.hidden = false;
  el.localError.textContent = message;
  el.btnLocal.textContent = LABEL_LOCAL_RETRY;
  el.btnLocalClear.hidden = false;
  if (log) {
    el.localLog.hidden = false;
    el.localLog.textContent = log;
  } else {
    el.localLog.hidden = true;
    el.localLog.textContent = "";
  }
}

function setManualMode(mode) {
  el.manualIdle.hidden = mode !== "idle";
  el.manualBusy.hidden = mode !== "busy";
  el.manualError.hidden = mode !== "error";
  el.manualWarn.hidden = mode !== "warn";
}

function showManualBusy(message) {
  setManualMode("busy");
  el.manualBusyText.textContent = message;
}

function showManualError(message, retryUrl) {
  lastRemoteUrl = retryUrl;
  setManualMode("error");
  el.manualErrorText.textContent = message;
  if (retryUrl) el.manualUrl.value = retryUrl;
}

function showManualVersionWarn(found, expected, retryUrl) {
  lastRemoteUrl = retryUrl;
  setManualMode("warn");
  el.manualWarnText.textContent = `Wersja hosta (v${found}) różni się od aplikacji (v${expected}). Połączenie może działać niestabilnie.`;
  if (retryUrl) el.manualUrl.value = retryUrl;
}

function hostButton(host, onClick) {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "host";
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = host.name || host.label || host.url;
  const meta = document.createElement("span");
  meta.className = "meta";
  const bits = [host.url || `http://${host.host}:${host.port}`];
  if (host.version) bits.push(`v${host.version}`);
  meta.textContent = bits.join(" · ");
  btn.append(name, meta);
  btn.addEventListener("click", onClick);
  li.append(btn);
  return li;
}

async function refreshDiscovery() {
  if (scanning || busy) return;
  setScanning(true);
  const started = Date.now();
  el.hostList.replaceChildren();
  const loading = document.createElement("li");
  loading.className = "empty";
  loading.textContent = "Szukam hostów StageSync…";
  el.hostList.append(loading);
  try {
    /** @type {DiscoveredHost[]} */
    const hosts = await invoke("discover_lan_hosts");
    const wait = SCAN_MIN_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    el.hostList.replaceChildren();
    if (!hosts.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent =
        "Brak hostów w sieci. Sprawdź Wi‑Fi / tryb samolotowy, firewall albo wpisz adres ręcznie.";
      el.hostList.append(empty);
      return;
    }
    for (const host of hosts) {
      el.hostList.append(
        hostButton(host, () => connectRemote(host.url)),
      );
    }
  } catch (err) {
    const wait = SCAN_MIN_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    el.hostList.replaceChildren();
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = friendlyDiscoverError(err);
    el.hostList.append(empty);
  } finally {
    setScanning(false);
  }
}

async function refreshRecent() {
  try {
    /** @type {RecentHost[]} */
    const recent = await invoke("launcher_list_recent");
    el.recentList.replaceChildren();
    if (!recent.length) {
      el.recentBlock.hidden = true;
      return;
    }
    el.recentBlock.hidden = false;
    for (const item of recent) {
      el.recentList.append(
        hostButton(
          { name: item.label, url: item.url, host: "", port: 0 },
          () => connectRemote(item.url),
        ),
      );
    }
  } catch {
    el.recentBlock.hidden = true;
  }
}

async function startLocal() {
  if (busy) return;
  setBusy(true);
  showLocalProgress("Uruchamiam lokalny host…");
  try {
    await invoke("start_local_host");
  } catch (err) {
    let log = "";
    try {
      log = await invoke("get_sidecar_log_tail");
    } catch {
      /* ignore */
    }
    showLocalError(friendlyLocalError(err), log || undefined);
    setBusy(false);
  }
}

/**
 * @param {string} rawUrl
 * @param {{ force?: boolean }} [opts]
 */
async function connectRemote(rawUrl, opts = {}) {
  if (busy) return;
  const url = String(rawUrl || "").trim();
  if (!url) return;
  lastRemoteUrl = url;
  setBusy(true);
  showManualBusy(`Sprawdzam ${url}…`);
  try {
    await invoke("connect_remote_host", {
      url,
      force: Boolean(opts.force),
    });
  } catch (err) {
    const mismatch = parseVersionMismatch(err);
    if (mismatch && !opts.force) {
      showManualVersionWarn(mismatch.found, mismatch.expected, url);
      setBusy(false);
      return;
    }
    showManualError(friendlyConnectError(err, url), url);
    setBusy(false);
  }
}

async function init() {
  await listen("launcher-status", (payload) => {
    if (!payload?.message || !busy || localHasError) return;
    // Progress updates while starting local host (main form stays visible).
    if (!el.localProgress.hidden) {
      el.localProgress.textContent = String(payload.message);
    }
  });

  try {
    bootstrap = await invoke("get_launcher_bootstrap");
  } catch (err) {
    el.btnLocal.disabled = true;
    showLocalError(String(err?.message ?? err));
    return;
  }

  el.footerVersion.textContent = `v${bootstrap.expectedVersion}`;
  el.appFooter.hidden = false;

  if (bootstrap.hasSidecar) {
    el.btnLocal.disabled = false;
    el.localHint.hidden = true;
    el.localHint.textContent = "";
  } else if (bootstrap.stagesyncUrl) {
    el.btnLocal.disabled = true;
    el.localHint.hidden = false;
    el.localHint.textContent = `Tryb deweloperski — użyj ${bootstrap.stagesyncUrl} albo wpisz host poniżej.`;
    el.manualUrl.value = bootstrap.stagesyncUrl.replace(/\/$/, "");
  } else {
    el.btnLocal.disabled = true;
    el.localHint.hidden = false;
    el.localHint.textContent =
      "Brak bundla sidecara. Uruchom serwer (`pnpm dev`) i połącz ręcznie do http://127.0.0.1:4000.";
    el.manualUrl.placeholder = "http://127.0.0.1:4000";
  }

  if (bootstrap.lastError) {
    showLocalError(friendlyLocalError(bootstrap.lastError));
  }

  el.btnLocal.addEventListener("click", () => void startLocal());
  el.btnLocalClear.addEventListener("click", () => clearLocalError());
  el.btnRefresh.addEventListener("click", () => void refreshDiscovery());
  el.manualForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const url = el.manualUrl.value.trim();
    if (url) void connectRemote(url);
  });
  el.btnManualRetry.addEventListener("click", () => {
    const url = lastRemoteUrl || el.manualUrl.value.trim();
    if (url) void connectRemote(url);
  });
  el.btnManualBack.addEventListener("click", () => {
    setBusy(false);
    setManualMode("idle");
  });
  el.btnManualForce.addEventListener("click", () => {
    const url = lastRemoteUrl || el.manualUrl.value.trim();
    if (url) void connectRemote(url, { force: true });
  });
  el.btnManualWarnBack.addEventListener("click", () => {
    setBusy(false);
    setManualMode("idle");
  });

  void refreshDiscovery();
  void refreshRecent();
}

void init();
