import { useCallback, useEffect, useRef, useState } from "react";

export function useDoubleConfirm(action: () => Promise<void>, label: string) {
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPending(false);
  }, []);

  const arm = useCallback(() => {
    if (pending) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setPending(false);
      void action();
      return;
    }
    setPending(true);
    timerRef.current = setTimeout(() => setPending(false), 4000);
  }, [action, pending]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!pending) return;
    let remove: (() => void) | undefined;
    const attachId = window.setTimeout(() => {
      const onDocClick = (event: MouseEvent) => {
        const el = buttonRef.current;
        if (el && event.target instanceof Node && el.contains(event.target)) {
          return;
        }
        cancel();
      };
      document.addEventListener("click", onDocClick);
      remove = () => document.removeEventListener("click", onDocClick);
    }, 0);
    return () => {
      window.clearTimeout(attachId);
      remove?.();
    };
  }, [pending, cancel]);

  return {
    pending,
    arm,
    buttonRef,
    label: pending ? `Potwierdź ${label}` : label,
  };
}
