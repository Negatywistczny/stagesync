import { domToBlob } from "modern-screenshot";
import type { DevPreviewRoute } from "./devSurfaceTypes.js";
import type { DevSurface } from "./devSurfaceTypes.js";

export const DEV_PREVIEW_SCREENSHOT_REQUEST =
  "stagesync-dev-preview-screenshot-request" as const;
export const DEV_PREVIEW_SCREENSHOT_RESPONSE =
  "stagesync-dev-preview-screenshot-response" as const;

type DevPreviewScreenshotRequest = {
  type: typeof DEV_PREVIEW_SCREENSHOT_REQUEST;
  requestId: string;
  width: number;
  height: number;
};

type DevPreviewScreenshotResponse = {
  type: typeof DEV_PREVIEW_SCREENSHOT_RESPONSE;
  requestId: string;
  ok: boolean;
  dataUrl?: string;
  error?: string;
};

const SCREENSHOT_TIMEOUT_MS = 15_000;

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",");
  const mime = header?.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const binary = atob(body ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Rasterizes a DOM subtree with modern-screenshot (dev-only).
 * SVG foreignObject capture taints canvas in Chromium and cannot export PNG.
 */
export async function captureElementToPng(
  element: HTMLElement,
  width: number,
  height: number,
): Promise<Blob> {
  const blob = await domToBlob(element, {
    width,
    height,
    scale: 1,
    backgroundColor: null,
  });
  if (!blob) {
    throw new Error("Failed to encode screenshot PNG");
  }
  return blob;
}

export function formatDevPreviewScreenshotTimestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function buildDevPreviewScreenshotFilename(
  surface: DevSurface,
  path: DevPreviewRoute,
  viewportId: string,
  timestamp = formatDevPreviewScreenshotTimestamp(),
): string {
  const route = path.replace(/^\//, "");
  return `${surface}-${route}-${viewportId}-${timestamp}.png`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function requestDevPreviewScreenshot(
  iframe: HTMLIFrameElement,
  width: number,
  height: number,
): Promise<Blob> {
  const win = iframe.contentWindow;
  if (!win) {
    throw new Error("Podgląd nie jest jeszcze gotowy");
  }

  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `screenshot-${Date.now()}`;

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Przekroczono czas oczekiwania na zrzut ekranu"));
    }, SCREENSHOT_TIMEOUT_MS);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== win) return;
      const data = event.data as DevPreviewScreenshotResponse | undefined;
      if (
        !data ||
        data.type !== DEV_PREVIEW_SCREENSHOT_RESPONSE ||
        data.requestId !== requestId
      ) {
        return;
      }

      cleanup();
      if (!data.ok || !data.dataUrl) {
        reject(new Error(data.error ?? "Nie udało się wykonać zrzutu ekranu"));
        return;
      }
      resolve(dataUrlToBlob(data.dataUrl));
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", onMessage);
    };

    window.addEventListener("message", onMessage);
    const payload: DevPreviewScreenshotRequest = {
      type: DEV_PREVIEW_SCREENSHOT_REQUEST,
      requestId,
      width,
      height,
    };
    win.postMessage(payload, window.location.origin);
  });
}

export function installDevPreviewScreenshotListener(): () => void {
  const handler = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as DevPreviewScreenshotRequest | undefined;
    if (!data || data.type !== DEV_PREVIEW_SCREENSHOT_REQUEST) return;

    const respond = (response: Omit<DevPreviewScreenshotResponse, "type">) => {
      const target = event.source;
      if (!target || typeof (target as Window).postMessage !== "function") {
        return;
      }
      (target as Window).postMessage(
        { type: DEV_PREVIEW_SCREENSHOT_RESPONSE, ...response },
        event.origin,
      );
    };

    void (async () => {
      try {
        const root =
          document.getElementById("root") ??
          document.body ??
          document.documentElement;
        const blob = await captureElementToPng(
          root,
          data.width,
          data.height,
        );
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(new Error("Failed to read screenshot blob"));
          reader.readAsDataURL(blob);
        });
        respond({ requestId: data.requestId, ok: true, dataUrl });
      } catch (error) {
        respond({
          requestId: data.requestId,
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Nie udało się wykonać zrzutu ekranu",
        });
      }
    })();
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
