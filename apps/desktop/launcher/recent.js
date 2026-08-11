import { formatDiscoveryMeta } from "./host-discovery.js";

/** @typedef {{ url: string, label: string }} RecentHost */

/**
 * Recent host tile with live online/offline probe diode.
 * @param {RecentHost} item
 * @param {() => void} onClick
 */
export function recentHostButton(item, onClick) {
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
export function setHealthDiode(diode, online) {
  diode.classList.remove("is-unknown", "is-online", "is-offline");
  if (online) {
    diode.classList.add("is-online");
    diode.title = "Online";
  } else {
    diode.classList.add("is-offline");
    diode.title = "Offline";
  }
}

export async function refreshRecent(el, invoke, onConnectRemote) {
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
      const { li, diode } = recentHostButton(item, () => onConnectRemote(item.url));
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
