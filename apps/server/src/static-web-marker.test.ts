import { describe, expect, it } from "vitest";
import { injectDesktopShellMarker } from "./static-web.js";

describe("injectDesktopShellMarker", () => {
  it("injects marker after opening <head>", () => {
    const out = injectDesktopShellMarker("<!doctype html><head></head><body>x</body>");
    expect(out).toContain('<head><meta name="stagesync-shell" content="desktop" />');
    expect(out).toContain('window.__STAGESYNC_SHELL__="desktop"');
    expect(out.indexOf("__STAGESYNC_SHELL__")).toBeLessThan(out.indexOf("</head>"));
  });

  it("injects before </head> when opening <head> tag is missing", () => {
    const out = injectDesktopShellMarker("<html><title>t</title></head><body/>");
    expect(out).toContain('window.__STAGESYNC_SHELL__="desktop"');
    expect(out.indexOf("__STAGESYNC_SHELL__")).toBeLessThan(out.indexOf("</head>"));
  });

  it("prefixes marker when document has no head tags", () => {
    const out = injectDesktopShellMarker("<p>bare</p>");
    expect(out.startsWith('<meta name="stagesync-shell"')).toBe(true);
    expect(out).toContain("<p>bare</p>");
  });

  it("is a no-op when marker script is already present", () => {
    const html =
      '<head><script>window.__STAGESYNC_SHELL__="desktop"</script></head>';
    expect(injectDesktopShellMarker(html)).toBe(html);
  });
});
