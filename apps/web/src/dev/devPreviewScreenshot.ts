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

function copyElementComputedStyles(source: Element, target: HTMLElement): void {
  const computed = window.getComputedStyle(source);
  for (let i = 0; i < computed.length; i += 1) {
    const prop = computed.item(i);
    if (!prop) continue;
    target.style.setProperty(
      prop,
      computed.getPropertyValue(prop),
      computed.getPropertyPriority(prop),
    );
  }
}

function cloneWithComputedStyles(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(false) as HTMLElement;
  copyElementComputedStyles(source, clone);

  for (const child of source.childNodes) {
    if (child instanceof HTMLElement) {
      clone.appendChild(cloneWithComputedStyles(child));
      continue;
    }
    if (child instanceof Text) {
      clone.appendChild(child.cloneNode());
    }
  }

  return clone;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to render screenshot SVG"));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode screenshot PNG"));
        return;
      }
      resolve(blob);
    }, type);
  });
}

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
 * Rasterizes a DOM subtree via SVG foreignObject (no extra deps).
 * External images / canvas / video may be blank or taint the canvas.
 */
export async function captureElementToPng(
  element: HTMLElement,
  width: number,
  height: number,
): Promise<Blob> {
  const clone = cloneWithComputedStyles(element);
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  wrapper.style.overflow = "hidden";
  wrapper.style.margin = "0";
  wrapper.style.padding = "0";
  wrapper.appendChild(clone);

  const xhtml = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<foreignObject width="100%" height="100%">
${xhtml}
</foreignObject>
</svg>`;

  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );

  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D unavailable");
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvasToBlob(canvas, "image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
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
  anchor.click();
  URL.revokeObjectURL(url);
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
