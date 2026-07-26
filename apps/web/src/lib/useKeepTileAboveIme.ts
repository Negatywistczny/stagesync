import { useEffect, type RefObject } from "react";

/**
 * Keep a form tile above the soft keyboard (Android WebView / mobile browsers).
 * Sets `--ss-ime-inset` on the scroll root from `visualViewport` and scrolls the
 * tile into view when the IME opens or a field inside the tile focuses.
 *
 * @param active — when false (e.g. gate unlocked), listeners stay off until the
 *   tile mounts; flip to true after the dialog is shown so refs are live.
 */
export function useKeepTileAboveIme(
  scrollRootRef: RefObject<HTMLElement | null>,
  tileRef: RefObject<HTMLElement | null>,
  active = true,
): void {
  useEffect(() => {
    if (!active) return;

    const root = scrollRootRef.current;
    const tile = tileRef.current;
    if (!root || !tile) return;

    const vv = window.visualViewport;
    let frame = 0;
    const focusTimers: number[] = [];

    const ensureVisible = () => {
      const viewTop = vv?.offsetTop ?? 0;
      const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const rect = tile.getBoundingClientRect();
      if (rect.bottom > viewBottom - 8 || rect.top < viewTop + 8) {
        tile.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const inset = vv
          ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
          : 0;
        root.style.setProperty("--ss-ime-inset", `${inset}px`);
        if (inset > 0) ensureVisible();
      });
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !tile.contains(target)) return;
      // IME animation is async on Android WebView — retry briefly.
      focusTimers.push(
        window.setTimeout(ensureVisible, 50),
        window.setTimeout(ensureVisible, 300),
      );
    };

    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    root.addEventListener("focusin", onFocusIn);
    sync();

    return () => {
      cancelAnimationFrame(frame);
      for (const id of focusTimers) window.clearTimeout(id);
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      root.removeEventListener("focusin", onFocusIn);
      root.style.removeProperty("--ss-ime-inset");
    };
  }, [scrollRootRef, tileRef, active]);
}
