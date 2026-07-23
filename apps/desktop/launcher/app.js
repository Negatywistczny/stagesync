/** @typedef {{ name: string, host: string, port: number, version?: string | null, url: string }} DiscoveredHost */
/** @typedef {{ url: string, label: string }} RecentHost */
/** @typedef {{ hasSidecar: boolean, stagesyncUrl: string | null, expectedVersion: string }} LauncherBootstrap */

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
  statusPanel: document.getElementById("statusPanel"),
  statusLabel: document.getElementById("statusLabel"),
  statusLog: document.getElementById("statusLog"),
  statusActions: document.getElementById("statusActions"),
  btnLocal: document.getElementById("btnLocal"),
  localHint: document.getElementById("localHint"),
  btnRefresh: document.getElementById("btnRefresh"),
  hostList: document.getElementById("hostList"),
  manualForm: document.getElementById("manualForm"),
  manualUrl: document.getElementById("manualUrl"),
  recentBlock: document.getElementById("recentBlock"),
  recentList: document.getElementById("recentList"),
};

/** @type {LauncherBootstrap | null} */
let bootstrap = null;
let busy = false;

function setBusy(next) {
  busy = next;
  el.btnLocal.disabled = next || !bootstrap?.hasSidecar;
  el.btnRefresh.disabled = next;
}

function showMain() {
  el.statusPanel.hidden = true;
  el.mainPanel.hidden = false;
  el.statusLog.hidden = true;
  el.statusLog.textContent = "";
  el.statusActions.replaceChildren();
}

/**
 * @param {string} label
 * @param {{ error?: boolean, log?: string, actions?: { label: string, className?: string, onClick: () => void }[] }} [opts]
 */
function showStatus(label, opts = {}) {
  el.mainPanel.hidden = true;
  el.statusPanel.hidden = false;
  el.statusLabel.textContent = label;
  el.statusLabel.classList.toggle("error", Boolean(opts.error));
  if (opts.log) {
    el.statusLog.hidden = false;
    el.statusLog.textContent = opts.log;
  } else {
    el.statusLog.hidden = true;
    el.statusLog.textContent = "";
  }
  el.statusActions.replaceChildren();
  for (const action of opts.actions ?? []) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn ${action.className ?? "secondary"}`;
    btn.textContent = action.label;
    btn.addEventListener("click", action.onClick);
    el.statusActions.append(btn);
  }
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
  el.hostList.replaceChildren();
  const loading = document.createElement("li");
  loading.className = "empty";
  loading.textContent = "Szukam hostów StageSync…";
  el.hostList.append(loading);
  try {
    /** @type {DiscoveredHost[]} */
    const hosts = await invoke("discover_lan_hosts");
    el.hostList.replaceChildren();
    if (!hosts.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent =
        "Brak hostów mDNS. Sprawdź firewall / włącz mDNS na hoście albo wpisz adres ręcznie.";
      el.hostList.append(empty);
      return;
    }
    for (const host of hosts) {
      el.hostList.append(
        hostButton(host, () => connectRemote(host.url)),
      );
    }
  } catch (err) {
    el.hostList.replaceChildren();
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = String(err?.message ?? err);
    el.hostList.append(empty);
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
  showStatus("Uruchamiam lokalny host…");
  try {
    await invoke("start_local_host");
  } catch (err) {
    const msg = String(err?.message ?? err);
    let log = "";
    try {
      log = await invoke("get_sidecar_log_tail");
    } catch {
      /* ignore */
    }
    showStatus(msg, {
      error: true,
      log: log || undefined,
      actions: [
        {
          label: "Ponów",
          className: "primary",
          onClick: () => {
            showMain();
            setBusy(false);
            void startLocal();
          },
        },
        {
          label: "Wróć",
          className: "ghost",
          onClick: () => {
            showMain();
            setBusy(false);
          },
        },
      ],
    });
    setBusy(false);
  }
}

async function connectRemote(rawUrl) {
  if (busy) return;
  setBusy(true);
  showStatus("Łączę z hostem…");
  try {
    await invoke("connect_remote_host", { url: rawUrl });
  } catch (err) {
    showStatus(String(err?.message ?? err), {
      error: true,
      actions: [
        {
          label: "Ponów",
          className: "primary",
          onClick: () => {
            showMain();
            setBusy(false);
            void connectRemote(rawUrl);
          },
        },
        {
          label: "Wróć",
          className: "ghost",
          onClick: () => {
            showMain();
            setBusy(false);
          },
        },
      ],
    });
    setBusy(false);
  }
}

async function init() {
  await listen("launcher-status", (payload) => {
    if (payload?.message) {
      showStatus(String(payload.message), { error: Boolean(payload.error) });
    }
  });

  try {
    bootstrap = await invoke("get_launcher_bootstrap");
  } catch (err) {
    showStatus(String(err?.message ?? err), { error: true });
    return;
  }

  if (bootstrap.hasSidecar) {
    el.btnLocal.disabled = false;
    el.localHint.textContent = `Wersja aplikacji: ${bootstrap.expectedVersion}`;
  } else if (bootstrap.stagesyncUrl) {
    el.btnLocal.disabled = true;
    el.localHint.textContent = `Tryb deweloperski — użyj ${bootstrap.stagesyncUrl} albo wpisz host poniżej.`;
    el.manualUrl.value = bootstrap.stagesyncUrl.replace(/\/$/, "");
  } else {
    el.btnLocal.disabled = true;
    el.localHint.textContent =
      "Brak bundla sidecara. Uruchom serwer (`pnpm dev`) i połącz ręcznie do http://127.0.0.1:4000.";
    el.manualUrl.placeholder = "http://127.0.0.1:4000";
  }

  el.btnLocal.addEventListener("click", () => void startLocal());
  el.btnRefresh.addEventListener("click", () => void refreshDiscovery());
  el.manualForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const url = el.manualUrl.value.trim();
    if (url) void connectRemote(url);
  });

  void refreshDiscovery();
  void refreshRecent();
}

void init();
