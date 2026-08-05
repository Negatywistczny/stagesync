import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isEditableKeyboardTarget } from "@lib/client/isEditableKeyboardTarget.js";
import {
  getAdminNavUrl,
  getClientNavUrl,
  getTimelineNavUrl,
  type AdminSectionId,
} from "./operatorNavRoutes.js";
import { markOperatorSession } from "./operatorSession.js";
import { shouldShowOperatorNav } from "./operatorSurface.js";

export type OperatorNavShortcutInput = {
  key: string;
  code: string;
  mod: boolean;
  alt: boolean;
  shift: boolean;
  ctrl: boolean;
  meta: boolean;
};

export type OperatorNavShortcutAction =
  | { type: "navigate"; path: string; markSession?: boolean }
  | null;

const ADMIN_SECTION_BY_DIGIT: Record<string, AdminSectionId> = {
  "1": "songs",
  "2": "set",
  "3": "stage",
  "4": "host",
};

export function isBlockingModalOpen(
  doc: Document | undefined = typeof document !== "undefined"
    ? document
    : undefined,
): boolean {
  if (!doc) return false;
  return Boolean(doc.querySelector('[role="dialog"][aria-modal]'));
}

/** Pure resolver — parity with Tauri menu Widok accelerators. */
export function resolveOperatorNavShortcut(
  input: OperatorNavShortcutInput,
): OperatorNavShortcutAction {
  const { key, mod, alt, shift } = input;
  if (shift) return null;

  if (mod && !alt) {
    if (key === "1") return { type: "navigate", path: getAdminNavUrl() };
    if (key === "2") return { type: "navigate", path: getTimelineNavUrl() };
    if (key === "3") {
      return {
        type: "navigate",
        path: getClientNavUrl(),
        markSession: true,
      };
    }
    return null;
  }

  if (alt && !mod) {
    const section = ADMIN_SECTION_BY_DIGIT[key];
    if (!section) return null;
    return { type: "navigate", path: getAdminNavUrl(section) };
  }

  return null;
}

export type UseOperatorNavShortcutsOptions = {
  enabled?: boolean;
  pathname: string;
};

export function useOperatorNavShortcuts({
  enabled = true,
  pathname,
}: UseOperatorNavShortcutsOptions): void {
  const navigate = useNavigate();
  const active = enabled && shouldShowOperatorNav(pathname);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (isEditableKeyboardTarget(ev.target)) return;
      if (isBlockingModalOpen()) return;

      const mod = ev.metaKey || ev.ctrlKey;
      const action = resolveOperatorNavShortcut({
        key: ev.key,
        code: ev.code,
        mod,
        alt: ev.altKey,
        shift: ev.shiftKey,
        ctrl: ev.ctrlKey,
        meta: ev.metaKey,
      });
      if (!action) return;

      ev.preventDefault();
      if (action.markSession) markOperatorSession();
      navigate(action.path);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, navigate]);
}
