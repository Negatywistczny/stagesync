/**
 * W3C Screen Wake Lock — PWA half of dual wake-lock (native APK uses FLAG_KEEP_SCREEN_ON).
 * Best-effort: unsupported browsers / denied permission → silent video loop fallback
 * (Safari without Wake Lock API).
 */

type WakeLockHandle = {
  release: () => Promise<void>;
};

let videoFallback: HTMLVideoElement | null = null;

function stopVideoFallback(): void {
  if (typeof document === "undefined" || !videoFallback) return;
  try {
    videoFallback.pause();
    videoFallback.removeAttribute("src");
    videoFallback.load();
    videoFallback.remove();
  } catch {
    /* ignore */
  }
  videoFallback = null;
}

/** Tiny silent looping video — keeps some browsers from dimming the screen. */
function startVideoFallback(): WakeLockHandle | null {
  if (typeof document === "undefined") return null;
  stopVideoFallback();
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 1, 1);
    if (typeof canvas.captureStream !== "function") return null;
    const stream = canvas.captureStream(1);
    const video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.style.cssText =
      "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;left:0;";
    video.srcObject = stream;
    document.body.appendChild(video);
    void video.play().catch(() => {
      /* autoplay may fail until gesture — best-effort */
    });
    videoFallback = video;
    return {
      release: async () => {
        stopVideoFallback();
      },
    };
  } catch {
    return null;
  }
}

export async function requestScreenWakeLock(): Promise<WakeLockSentinel | null> {
  if (typeof navigator === "undefined") return null;
  const anyNav = navigator as Navigator & {
    wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
  };
  if (anyNav.wakeLock?.request) {
    try {
      stopVideoFallback();
      return await anyNav.wakeLock.request("screen");
    } catch {
      /* fall through to video */
    }
  }
  const fallback = startVideoFallback();
  return fallback as unknown as WakeLockSentinel | null;
}

export async function releaseScreenWakeLock(
  sentinel: WakeLockSentinel | null,
): Promise<void> {
  stopVideoFallback();
  if (!sentinel) return;
  try {
    await sentinel.release();
  } catch {
    /* ignore */
  }
}
