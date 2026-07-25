import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ConnectionIndicator,
  connectionStatusLabel,
} from "./ConnectionIndicator.js";

describe("ConnectionIndicator", () => {
  it("exposes Polish status labels", () => {
    expect(connectionStatusLabel("connected")).toBe("Połączony");
    expect(connectionStatusLabel("disconnected")).toBe("Rozłączony");
    expect(connectionStatusLabel("connecting")).toBe("Łączenie…");
  });

  it("dot variant is labelled for assistive tech", () => {
    const out = renderToStaticMarkup(
      <ConnectionIndicator status="connected" variant="dot" />,
    );
    expect(out).toContain('aria-label="Połączony"');
    expect(out).toContain('title="Połączony"');
  });

  it("status variant announces with role=status and latency", () => {
    const out = renderToStaticMarkup(
      <ConnectionIndicator
        status="connected"
        variant="status"
        latencyMs={42.4}
      />,
    );
    expect(out).toContain('role="status"');
    expect(out).toContain('aria-live="polite"');
    expect(out).toContain("Połączony");
    expect(out).toContain("42 ms");
    expect(out).toContain('title="Połączony · 42 ms"');
  });

  it("ignores non-finite latency and custom title wins", () => {
    const out = renderToStaticMarkup(
      <ConnectionIndicator
        status="disconnected"
        variant="label"
        latencyMs={Number.NaN}
        title="Host offline"
      />,
    );
    expect(out).toContain('title="Host offline"');
    expect(out).toContain("Rozłączony");
    expect(out).not.toContain(" ms");
  });
});
