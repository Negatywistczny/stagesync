import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import "./context-menu.css";

export type ContextMenuActionItem = {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
};

export type ContextMenuSeparatorItem = { type: "separator" };

export type ContextMenuItem =
  | ContextMenuActionItem
  | ContextMenuSeparatorItem;

export type OpenContextMenuArgs = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  /** Optional accessible label for the menu. */
  label?: string;
};

export type ContextMenuApi = {
  openAt: (args: OpenContextMenuArgs) => void;
  close: () => void;
};

type MenuState = OpenContextMenuArgs | null;

const ContextMenuContext = createContext<ContextMenuApi | null>(null);

function isActionItem(item: ContextMenuItem): item is ContextMenuActionItem {
  return !("type" in item && item.type === "separator");
}

function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
): { left: number; top: number } {
  const pad = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : width;
  const vh = typeof window !== "undefined" ? window.innerHeight : height;
  return {
    left: Math.max(pad, Math.min(x, vw - width - pad)),
    top: Math.max(pad, Math.min(y, vh - height - pad)),
  };
}

function ContextMenuPortal({
  state,
  onClose,
}: {
  state: OpenContextMenuArgs;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const [pos, setPos] = useState({ left: state.x, top: state.y });

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(clampPosition(state.x, state.y, rect.width, rect.height));
  }, [state.x, state.y, state.items]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    function onPointerDown(e: MouseEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onClose();
    }
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onPointerDown, true);
    };
  }, [onClose]);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLButtonElement>(
      "button.ss-context-menu__item:not(:disabled)",
    );
    first?.focus();
  }, [state.items]);

  const title = state.label ?? "Menu kontekstowe";

  return createPortal(
    <div
      ref={menuRef}
      className="ss-context-menu"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
      aria-label={title}
      aria-labelledby={state.label ? labelId : undefined}
      tabIndex={-1}
    >
      {state.label ? (
        <span id={labelId} className="ss-context-menu__shortcut" hidden>
          {state.label}
        </span>
      ) : null}
      {state.items.map((item, index) => {
        if (!isActionItem(item)) {
          return (
            <hr
              key={`sep-${index}`}
              className="ss-context-menu__separator"
              role="separator"
            />
          );
        }
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={[
              "ss-context-menu__item",
              item.danger ? "ss-context-menu__item--danger" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onSelect();
              onClose();
            }}
          >
            <span>{item.label}</span>
            {item.shortcut ? (
              <span className="ss-context-menu__shortcut">{item.shortcut}</span>
            ) : null}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MenuState>(null);

  const close = useCallback(() => setState(null), []);

  const openAt = useCallback((args: OpenContextMenuArgs) => {
    if (!args.items.length) {
      setState(null);
      return;
    }
    setState(args);
  }, []);

  const api = useMemo<ContextMenuApi>(
    () => ({ openAt, close }),
    [openAt, close],
  );

  return (
    <ContextMenuContext.Provider value={api}>
      {children}
      {state ? <ContextMenuPortal state={state} onClose={close} /> : null}
    </ContextMenuContext.Provider>
  );
}

export function useContextMenu(): ContextMenuApi {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error("useContextMenu must be used within ContextMenuProvider");
  }
  return ctx;
}
