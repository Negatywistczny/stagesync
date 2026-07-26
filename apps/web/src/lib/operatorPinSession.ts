/** ADR 0017 §8a — Operator PIN session TTL outside PLAYING. */

import { clearStoredOperatorPin } from "./operatorPin.js";

export const OPERATOR_PIN_IDLE_TTL_MS = 15 * 60 * 1000;

/** Lock screen / tab hide clears PIN only when transport is not PLAYING. */
export function shouldClearOperatorPinOnHide(playing: boolean): boolean {
  return !playing;
}

/**
 * Idle watchdog: expires after `idleMs` without `touch()` while not PLAYING.
 * While PLAYING, the timer is cleared and never fires.
 */
export function createOperatorPinIdleWatchdog(options: {
  getPlaying: () => boolean;
  onExpire: () => void;
  idleMs?: number;
  now?: () => number;
}): { touch: () => void; syncPlaying: () => void; dispose: () => void } {
  const idleMs = options.idleMs ?? OPERATOR_PIN_IDLE_TTL_MS;
  const now = options.now ?? (() => Date.now());
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastTouch = now();

  function clearTimer() {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function arm() {
    clearTimer();
    if (options.getPlaying()) return;
    const remaining = idleMs - (now() - lastTouch);
    if (remaining <= 0) {
      options.onExpire();
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      if (options.getPlaying()) return;
      if (now() - lastTouch >= idleMs) options.onExpire();
      else arm();
    }, remaining);
  }

  return {
    touch() {
      lastTouch = now();
      arm();
    },
    syncPlaying() {
      if (options.getPlaying()) clearTimer();
      else arm();
    },
    dispose() {
      clearTimer();
    },
  };
}

export function lockOperatorPinSession(): void {
  clearStoredOperatorPin();
}
