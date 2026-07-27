import { useEffect, useState } from "react";
import { MQ_MOBILE_COMPACT } from "./breakpoints.js";

/** True when viewport matches narrow-phone chrome (`MQ_MOBILE_COMPACT`, ≤640px). */
export function useMqMobileCompact(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(MQ_MOBILE_COMPACT).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MQ_MOBILE_COMPACT);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}
