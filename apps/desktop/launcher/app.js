/** @typedef {{ name: string, host: string, port: number, version?: string | null, url: string, hostname?: string | null, project?: string | null, status?: string | null }} DiscoveredHost */
/** @typedef {{ url: string, label: string }} RecentHost */
/** @typedef {{ hasSidecar: boolean, stagesyncUrl: string | null, expectedVersion: string, lastError?: string | null, ignoredVersion?: string | null, localHostUrl?: string | null }} LauncherBootstrap */
/** @typedef {{ available: boolean, version?: string | null, current: string, notes?: string | null }} DesktopUpdateInfo */

import { shouldShowUpdateDialog } from "./updateDialog.js";
import { formatDiscoveryMeta, formatDiscoveryTitle } from "./host-discovery.js";
import { installHtmlTitleBar } from "./window.js";
import { refreshRecent } from "./recent.js";
import {
  friendlyConnectError,
  parseVersionMismatch,
  setManualMode,
  showManualBusy,
  showManualError,
  showManualVersionWarn,
} from "./manual-connect.js";
import {
  LABEL_LOCAL_IDLE,
  LABEL_LOCAL_RETRY,
  friendlyLocalError,
  resolveLocalLog,
  downloadTextFile,
  buildLocalLogExport,
  syncLocalErrorActions,
} from "./local-host.js";

const SCAN_MIN_MS = 900;
const NO_PROJECT = "Brak projektu";

export const invoke = async (cmd, args = {}) => {
  const core = window.__TAURI__?.core;
  if (!core?.invoke) {
    throw new Error("Brak mostka Tauri — uruchom Launcher w aplikacji StageSync.");
  }
  return core.invoke(cmd, args);
};

export const listen = async (event, handler) => {
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
  syncLocalErrorActions(el, localHasError, lastLocalLog, busy);
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

async function downloadLocalLog() {
  const message = lastLocalErrorMessage || el.localError.textContent || "";
  const log = lastLocalLog || el.localLog.textContent || "";
  const payload = buildLocalLogExport(message, log);
  if (!payload) {
    el.localProgress.hidden = false;
    el.localProgress.textContent =
      "Brak logu do pobrania. Sprawdź ~/Documents/StageSync/logs/sidecar.log albo spróbuj uruchomić host ponownie.";
    return;
  }
  try {
    const savedPath = await invoke("save_launcher_log", payload);
    el.localProgress.hidden = false;
    el.localProgress.textContent = `Zapisano log: ${savedPath}`;
  } catch (err) {
    try {
      downloadTextFile(payload.filename, payload.content);
    } catch {
      showLocalError(
        friendlyLocalError(err),
        lastLocalLog || el.localLog.textContent || undefined,
      );
    }
  }
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
  syncLocalErrorActions(el, localHasError, lastLocalLog, busy);
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
  syncLocalErrorActions(el, localHasError, lastLocalLog, busy);
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
  syncLocalErrorActions(el, localHasError, lastLocalLog, busy);
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

async function startLocal() {
  if (busy) return;
  setBusy(true);
  showLocalProgress("Uruchamiam lokalny host…");
  try {
    await invoke("start_local_host");
  } catch (err) {
    const log = await resolveLocalLog(err, invoke);
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
  showManualBusy(el, `Sprawdzam ${url}…`);
  try {
    await invoke("connect_remote_host", {
      url,
      force: Boolean(opts.force),
    });
  } catch (err) {
    const mismatch = parseVersionMismatch(err);
    if (mismatch && !opts.force) {
      showManualVersionWarn(el, mismatch.found, mismatch.expected, url);
      setBusy(false);
      return;
    }
    showManualError(el, friendlyConnectError(err, url), url);
    setBusy(false);
  }
}

async function init() {
  installHtmlTitleBar({
    onRefresh: refreshDiscovery,
    onCheckUpdate: checkForDesktopUpdate,
    invoke,
  });

  await listen("launcher-status", (payload) => {
    if (!payload?.message || !busy || localHasError) return;
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
    if (bootstrap.localHostUrl) {
      el.localHint.hidden = false;
      el.localHint.innerHTML = `Host już działa (<code>${bootstrap.localHostUrl}</code>). Kliknij „Uruchom lokalny host” albo Połącz ręcznie — UI dev przekieruje z <code>:4000</code> na <code>:3000</code>.`;
      el.manualUrl.value = bootstrap.localHostUrl.replace(/\/$/, "");
    } else {
      el.localHint.hidden = true;
      el.localHint.textContent = "";
    }
  } else if (bootstrap.stagesyncUrl) {
    el.btnLocal.disabled = true;
    el.localHint.hidden = false;
    el.localHint.innerHTML = `Tryb deweloperski — użyj <code>${bootstrap.stagesyncUrl}</code> albo wpisz host poniżej.`;
    el.manualUrl.value = bootstrap.stagesyncUrl.replace(/\/$/, "");
  } else {
    el.btnLocal.disabled = true;
    el.localHint.hidden = false;
    el.localHint.innerHTML =
      "Brak bundla sidecara. Uruchom <code>pnpm dev</code> i połącz ręcznie: <code>http://127.0.0.1:4000</code> (API; UI na <code>:3000</code>).";
    el.manualUrl.placeholder = "http://127.0.0.1:4000";
  }
  syncLocalButtonAria();

  if (bootstrap.lastError) {
    const log = await resolveLocalLog(bootstrap.lastError, invoke);
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
    setManualMode(el, "idle");
  });
  el.btnManualForce.addEventListener("click", () => {
    const url = lastRemoteUrl || el.manualUrl.value.trim();
    if (url) void connectRemote(url, { force: true });
  });
  el.btnManualWarnBack.addEventListener("click", () => {
    setBusy(false);
    setManualMode(el, "idle");
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
  void refreshRecent(el, invoke, connectRemote);
  void checkForDesktopUpdate();

  setTimeout(async () => {
    try {
      if (window.__TAURI__?.core?.invoke) {
        try {
          await window.__TAURI__.core.invoke("plugin:window|close", {
            label: "splashscreen",
          });
        } catch {}
        await window.__TAURI__.core.invoke("plugin:window|show", { label: "main" });
        await window.__TAURI__.core.invoke("plugin:window|set_focus", { label: "main" });
      }
    } catch (e) {
      console.warn("Failed to manage windows via IPC", e);
    }
  }, 200);
}

void init();
