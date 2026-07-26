import { useEffect, useState } from "react";
import { MQ_MOBILE } from "./breakpoints.js";

/** True when viewport matches phone breakpoint (`MQ_MOBILE`, ≤768px). Tablets stay false. */
export function useMqMobile(): boolean {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(MQ_MOBILE).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MQ_MOBILE);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return mobile;
}
