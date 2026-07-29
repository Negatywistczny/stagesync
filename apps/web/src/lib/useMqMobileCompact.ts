import { useEffect, useState } from "react";
import { MQ_MOBILE_COMPACT } from "./breakpoints.js";
import { shouldUseMobileCompactChrome } from "./operatorSurface.js";

/**
 * True when viewport matches narrow-phone chrome (`MQ_MOBILE_COMPACT`, ≤640px).
 * Always false on Tauri desktop (OS menu) — narrow window keeps desktop chrome.
 */
export function useMqMobileCompact(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    if (!shouldUseMobileCompactChrome()) return false;
    return window.matchMedia(MQ_MOBILE_COMPACT).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (!shouldUseMobileCompactChrome()) {
      setCompact(false);
      return;
    }
    const mq = window.matchMedia(MQ_MOBILE_COMPACT);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}
