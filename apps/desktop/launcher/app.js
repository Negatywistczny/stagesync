/** @typedef {{ name: string, host: string, port: number, version?: string | null, url: string, hostname?: string | null, project?: string | null, status?: string | null }} DiscoveredHost */
/** @typedef {{ url: string, label: string }} RecentHost */
/** @typedef {{ hasSidecar: boolean, stagesyncUrl: string | null, expectedVersion: string, lastError?: string | null, ignoredVersion?: string | null }} LauncherBootstrap */
/** @typedef {{ available: boolean, version?: string | null, current: string, notes?: string | null }} DesktopUpdateInfo */

import { localErrorActionsVisibility } from "./localErrorActions.js";
import { shouldShowUpdateDialog } from "./updateDialog.js";
import { formatDiscoveryMeta, formatDiscoveryTitle } from "./host-discovery.js";

const SCAN_MIN_MS = 900;
const LABEL_LOCAL_IDLE = "Uruchom lokalny host";
const LABEL_LOCAL_RETRY = "Ponów uruchomienie";
const VERSION_MISMATCH_PREFIX = "VERSION_MISMATCH:";
const NO_PROJECT = "Brak projektu";

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
  btnLocalDiagnosticLog: document.getElementById("btnLocalDiagnosticLog"),
  btnHeaderDownloadLog: document.getElementById("btnHeaderDownloadLog"),
  localErrorActions: document.getElementById("localErrorActions"),
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
  updateOverlay: document.getElementById("updateOverlay"),
  updateTitle: document.getElementById("updateTitle"),
  updateMeta: document.getElementById("updateMeta"),
  updateError: document.getElementById("updateError"),
  btnUpdateNow: document.getElementById("btnUpdateNow"),
  btnUpdateLater: document.getElementById("btnUpdateLater"),
  btnUpdateSkip: document.getElementById("btnUpdateSkip"),
};

/** @type {LauncherBootstrap | null} */
let bootstrap = null;
let busy = false;
let scanning = false;
/** @type {string | null} */
let lastRemoteUrl = null;
let localHasError = false;
/** @type {string} */
let lastLocalErrorMessage = "";
/** @type {string} */
let lastLocalLog = "";
/** @type {DesktopUpdateInfo | null} */
let pendingUpdate = null;
let updateInstalling = false;

function setUpdateError(msg) {
  if (!msg) {
    el.updateError.hidden = true;
    el.updateError.textContent = "";
    return;
  }
  el.updateError.hidden = false;
  el.updateError.textContent = msg;
}

function hideUpdateDialog() {
  el.updateOverlay.hidden = true;
  pendingUpdate = null;
  setUpdateError(null);
  el.btnUpdateNow.disabled = false;
  el.btnUpdateLater.disabled = false;
  el.btnUpdateSkip.disabled = false;
  el.btnUpdateNow.textContent = "Aktualizuj";
}

/**
 * @param {DesktopUpdateInfo} info
 */
function showUpdateDialog(info) {
  pendingUpdate = info;
  const next = info.version ?? "?";
  const cur = info.current ?? bootstrap?.expectedVersion ?? "?";
  el.updateTitle.textContent = `Dostępna wersja ${next}`;
  el.updateMeta.textContent = `Korzystasz z wersji ${cur}.`;
  setUpdateError(null);
  el.updateOverlay.hidden = false;
  el.btnUpdateLater.focus();
}

/**
 * @param {{ force?: boolean }} [opts]
 */
async function checkForDesktopUpdate(opts = {}) {
  try {
    /** @type {DesktopUpdateInfo} */
    const info = await invoke("check_desktop_update");
    const ignored =
      bootstrap?.ignoredVersion ??
      (await invoke("launcher_get_ignored_version").catch(() => null));
    if (!shouldShowUpdateDialog(info, ignored, opts)) {
      if (opts.force && info && !info.available) {
        // Manual check while already current — brief footer flash is enough.
        el.footerVersion.textContent = `v${info.current} (aktualna)`;
      }
      return;
    }
    if (info.available) showUpdateDialog(info);
  } catch (err) {
    if (opts.force) {
      const cur = bootstrap?.expectedVersion ?? "?";
      el.footerVersion.textContent = `v${cur} — nie udało się sprawdzić aktualizacji`;
      console.warn("check_desktop_update", err);
    }
    // Silent on auto-check (offline / unsigned builds).
  }
}

async function installPendingUpdate() {
  if (!pendingUpdate?.available || updateInstalling) return;
  updateInstalling = true;
  el.btnUpdateNow.disabled = true;
  el.btnUpdateLater.disabled = true;
  el.btnUpdateSkip.disabled = true;
  el.btnUpdateNow.textContent = "Aktualizuję…";
  setUpdateError(null);
  try {
    await invoke("install_desktop_update");
    // process restarts on success
  } catch (err) {
    updateInstalling = false;
    el.btnUpdateNow.disabled = false;
    el.btnUpdateLater.disabled = false;
    el.btnUpdateSkip.disabled = false;
    el.btnUpdateNow.textContent = "Aktualizuj";
    setUpdateError(String(err?.message ?? err));
  }
}

async function skipPendingUpdate() {
  if (updateInstalling) return;
  const ver = pendingUpdate?.version;
  if (ver) {
    try {
      await invoke("launcher_set_ignored_version", { version: ver });
      if (bootstrap) bootstrap.ignoredVersion = ver;
    } catch (err) {
      setUpdateError(String(err?.message ?? err));
      return;
    }
  }
  hideUpdateDialog();
}

function setBusy(next) {
  busy = next;
  const canLocal = Boolean(bootstrap?.hasSidecar);
  el.btnLocal.disabled = next || !canLocal;
  el.btnRefresh.disabled = next || scanning;
  el.btnLocalClear.disabled = next;
  el.btnLocalDiagnosticLog.disabled = next;
  syncLocalErrorActions();
  syncLocalButtonAria();
}

function syncLocalButtonAria() {
  const label = el.btnLocal.textContent?.trim() || LABEL_LOCAL_IDLE;
  el.btnLocal.setAttribute(
    "aria-label",
    busy ? "Uruchamianie lokalnego hosta…" : label,
  );
  el.btnLocal.setAttribute("aria-busy", busy ? "true" : "false");
}

function setScanning(next) {
  scanning = next;
  el.btnRefresh.setAttribute("aria-busy", next ? "true" : "false");
  el.btnRefresh.setAttribute(
    "aria-label",
    next ? "Odświeżanie listy hostów…" : "Odśwież listę hostów",
  );
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

/** Extract embedded sidecar log from a Rust failure string (`— log hosta —`). */
function extractEmbeddedLog(raw) {
  const text = String(raw?.message ?? raw ?? "");
  const marker = "\n\n— log";
  const idx = text.indexOf(marker);
  if (idx < 0) return "";
  const after = text.slice(idx + marker.length);
  const nl = after.indexOf("\n");
  return (nl >= 0 ? after.slice(nl + 1) : after).trim();
}

/** Prefer live sidecar tail; fall back to embedded log in the error payload. */
async function resolveLocalLog(rawErr) {
  try {
    const tail = await invoke("get_sidecar_log_tail");
    if (String(tail || "").trim()) return String(tail);
  } catch {
    /* ignore */
  }
  return extractEmbeddedLog(rawErr);
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadLocalLog() {
  const message = lastLocalErrorMessage || el.localError.textContent || "";
  const log = lastLocalLog || el.localLog.textContent || "";
  if (!log.trim()) return;
  const parts = [
    "# StageSync — log startu lokalnego hosta",
    `# ${new Date().toISOString()}`,
  ];
  if (message.trim()) {
    parts.push("", "## Komunikat", message.trim());
  }
  parts.push("", "## Log hosta", log.trim());
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  downloadTextFile(`stagesync-host-${stamp}.log`, `${parts.join("\n")}\n`);
}

function syncLocalErrorActions() {
  const vis = localErrorActionsVisibility({
    hasError: localHasError,
    hasLog: Boolean(lastLocalLog.trim()),
  });
  el.btnLocalClear.hidden = !vis.showClear;
  el.btnLocalDiagnosticLog.hidden = !vis.showDiagnosticDownload;
  el.localErrorActions.hidden = !vis.showRow;
  el.btnHeaderDownloadLog.disabled = busy || !vis.headerDownloadEnabled;
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
  lastLocalErrorMessage = "";
  lastLocalLog = "";
  el.localError.hidden = true;
  el.localError.textContent = "";
  el.localProgress.hidden = true;
  el.localProgress.textContent = "";
  el.localLog.hidden = true;
  el.localLog.textContent = "";
  syncLocalErrorActions();
  el.btnLocal.textContent = LABEL_LOCAL_IDLE;
  syncLocalButtonAria();
}

function showLocalProgress(message) {
  localHasError = false;
  lastLocalErrorMessage = "";
  lastLocalLog = "";
  el.localError.hidden = true;
  el.localError.textContent = "";
  el.localLog.hidden = true;
  el.localLog.textContent = "";
  syncLocalErrorActions();
  el.localProgress.hidden = false;
  el.localProgress.textContent = message;
  el.btnLocal.textContent = LABEL_LOCAL_IDLE;
  syncLocalButtonAria();
}

function showLocalError(message, log) {
  localHasError = true;
  lastLocalErrorMessage = String(message || "");
  lastLocalLog = String(log || "").trim();
  el.localProgress.hidden = true;
  el.localProgress.textContent = "";
  el.localError.hidden = false;
  el.localError.textContent = message;
  el.btnLocal.textContent = LABEL_LOCAL_RETRY;
  syncLocalButtonAria();
  if (lastLocalLog) {
    el.localLog.hidden = false;
    el.localLog.textContent = lastLocalLog;
  } else {
    el.localLog.hidden = true;
    el.localLog.textContent = "";
  }
  syncLocalErrorActions();
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

/** @param {string | null | undefined} status */
function transportStatusClass(status) {
  const raw = String(status || "").toUpperCase();
  if (raw === "PLAYING") return "is-playing";
  if (raw === "PAUSED") return "is-paused";
  return "is-stopped";
}

/** @param {string | null | undefined} status */
function transportStatusLabel(status) {
  const raw = String(status || "").toUpperCase();
  if (raw === "PLAYING") return "Odtwarzanie";
  if (raw === "PAUSED") return "Pauza";
  return "Stop";
}

/**
 * Discovered host tile: hostname title, project badge + transport diode, IP · version.
 * @param {DiscoveredHost} host
 * @param {() => void} onClick
 */
function discoveredHostButton(host, onClick) {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "host hostTile";

  const urlText = host.url || `http://${host.host}:${host.port}`;
  const titleText = formatDiscoveryTitle({
    hostname: host.hostname,
    origin: urlText,
    serviceName: host.name,
  });
  const metaText = formatDiscoveryMeta({
    origin: urlText,
    version: host.version,
    project: host.project,
  });
  btn.setAttribute("aria-label", `Połącz z ${titleText} (${urlText})`);

  const title = document.createElement("span");
  title.className = "name";
  title.textContent = titleText;

  const mid = document.createElement("span");
  mid.className = "hostMid";

  const diode = document.createElement("span");
  diode.className = `statusDiode ${transportStatusClass(host.status)}`;
  diode.title = transportStatusLabel(host.status);
  diode.setAttribute("aria-hidden", "true");

  const badge = document.createElement("span");
  badge.className = "projectBadge";
  badge.textContent =
    (host.project && String(host.project).trim()) || NO_PROJECT;

  mid.append(diode, badge);

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = metaText;

  btn.append(title, mid, meta);
  btn.addEventListener("click", onClick);
  li.append(btn);
  return li;
}

/**
 * Recent host tile with live online/offline probe diode.
 * @param {RecentHost} item
 * @param {() => void} onClick
 */
function recentHostButton(item, onClick) {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "host hostTile hostRecent";
  const label = item.label || item.url;
  btn.setAttribute("aria-label", `Połącz z ${label} (${item.url})`);

  const row = document.createElement("span");
  row.className = "recentRow";

  const diode = document.createElement("span");
  diode.className = "healthDiode is-unknown";
  diode.title = "Sprawdzam…";
  diode.setAttribute("aria-hidden", "true");
  diode.dataset.url = item.url;

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = label;

  row.append(diode, name);

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = formatDiscoveryMeta({ origin: item.url });

  btn.append(row, meta);
  btn.addEventListener("click", onClick);
  li.append(btn);
  return { li, diode };
}

/** @param {HTMLElement} diode @param {boolean} online */
function setHealthDiode(diode, online) {
  diode.classList.remove("is-unknown", "is-online", "is-offline");
  if (online) {
    diode.classList.add("is-online");
    diode.title = "Online";
  } else {
    diode.classList.add("is-offline");
    diode.title = "Offline";
  }
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
        discoveredHostButton(host, () => connectRemote(host.url)),
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
    /** @type {{ url: string, diode: HTMLElement }[]} */
    const probes = [];
    for (const item of recent) {
      const { li, diode } = recentHostButton(item, () => connectRemote(item.url));
      el.recentList.append(li);
      probes.push({ url: item.url, diode });
    }
    await Promise.all(
      probes.map(async ({ url, diode }) => {
        try {
          const online = await invoke("probe_host_health", { url });
          setHealthDiode(diode, Boolean(online));
        } catch {
          setHealthDiode(diode, false);
        }
      }),
    );
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
    const log = await resolveLocalLog(err);
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
  syncLocalButtonAria();

  if (bootstrap.lastError) {
    const log = await resolveLocalLog(bootstrap.lastError);
    showLocalError(friendlyLocalError(bootstrap.lastError), log || undefined);
  }

  el.btnLocal.addEventListener("click", () => void startLocal());
  el.btnLocalClear.addEventListener("click", () => clearLocalError());
  el.btnLocalDiagnosticLog.addEventListener("click", () => downloadLocalLog());
  el.btnHeaderDownloadLog.addEventListener("click", () => downloadLocalLog());
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

  el.btnUpdateNow.addEventListener("click", () => void installPendingUpdate());
  el.btnUpdateLater.addEventListener("click", () => hideUpdateDialog());
  el.btnUpdateSkip.addEventListener("click", () => void skipPendingUpdate());
  el.updateOverlay.addEventListener("click", (e) => {
    if (e.target === el.updateOverlay && !updateInstalling) hideUpdateDialog();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.updateOverlay.hidden && !updateInstalling) {
      hideUpdateDialog();
    }
  });

  await listen("launcher-check-update", () => {
    void checkForDesktopUpdate({ force: true });
  });

  void refreshDiscovery();
  void refreshRecent();
  void checkForDesktopUpdate();
}

void init();
