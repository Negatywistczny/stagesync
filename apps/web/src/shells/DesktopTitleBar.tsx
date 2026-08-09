import { useCallback, useEffect } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { DesktopMenuBar } from "./DesktopMenuBar.js";
import {
  closeAppWindow,
  minimizeAppWindow,
  startWindowDragging,
  toggleMaximizeAppWindow,
} from "@lib/client/desktopBridge.js";
import styles from "./DesktopTitleBar.module.css";

const HTML_TITLEBAR_ATTR = "data-ss-html-titlebar";

export function DesktopTitleBar() {
  useEffect(() => {
    document.documentElement.setAttribute(HTML_TITLEBAR_ATTR, "");
    return () => {
      document.documentElement.removeAttribute(HTML_TITLEBAR_ATTR);
    };
  }, []);

  const onDragMouseDown = useCallback((ev: ReactMouseEvent) => {
    if (ev.button !== 0) return;
    const target = ev.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, a, input, [role='menuitem'], [role='menu']")) {
      return;
    }
    void startWindowDragging();
  }, []);

  const onDragDoubleClick = useCallback((ev: ReactMouseEvent) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, a, input, [role='menuitem'], [role='menu']")) {
      return;
    }
    void toggleMaximizeAppWindow();
  }, []);

  return (
    <header
      className={styles.titleBar}
      data-tauri-drag-region
      onMouseDown={onDragMouseDown}
      onDoubleClick={onDragDoubleClick}
    >
      <div className={styles.menuSlot} data-tauri-drag-region="false">
        <DesktopMenuBar />
      </div>
      <div className={styles.title} data-tauri-drag-region aria-hidden>
        StageSync
      </div>
      <div className={styles.controls} role="group" aria-label="Sterowanie oknem">
        <button
          type="button"
          className={styles.control}
          aria-label="Minimalizuj"
          onClick={() => void minimizeAppWindow()}
        >
          <span className={styles.iconMin} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.control}
          aria-label="Maksymalizuj"
          onClick={() => void toggleMaximizeAppWindow()}
        >
          <span className={styles.iconMax} aria-hidden />
        </button>
        <button
          type="button"
          className={`${styles.control} ${styles.controlClose}`}
          aria-label="Zamknij"
          onClick={() => void closeAppWindow()}
        >
          <span className={styles.iconClose} aria-hidden />
        </button>
      </div>
    </header>
  );
}
