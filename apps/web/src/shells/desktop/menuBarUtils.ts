import { useEffect, useState } from "react";
import { DESKTOP_MENU_EVENT } from "@lib/client/desktopMenuEvents.js";
import type { DesktopMenuLeaf } from "@lib/client/desktopHtmlMenuModel.js";
import { MQ_TABLET } from "@lib/timeline/breakpoints.js";

export const MENU_ROOT_ATTR = "data-ss-desktop-menu";

export type Actionable = {
  item: Extract<DesktopMenuLeaf, { kind: "action" | "submenu" }>;
};

export function dispatchAction(action: string): void {
  window.dispatchEvent(
    new CustomEvent(DESKTOP_MENU_EVENT, { detail: { action } }),
  );
}

export function actionableOf(items: DesktopMenuLeaf[]): Actionable[] {
  const out: Actionable[] = [];
  for (const item of items) {
    if (item.kind === "action" || item.kind === "submenu") {
      out.push({ item });
    }
  }
  return out;
}

export function useTitleBarCompact(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MQ_TABLET).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(MQ_TABLET);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}

/**
 * Dispatch keyboard to the active MenuList via a lightweight bus so nested
 * FixedFlyout (portaled) still receives the same handler owner.
 */
export function emitMenuKey(ev: KeyboardEvent): void {
  window.dispatchEvent(new CustomEvent("stagesync:menu-key", { detail: ev }));
}
