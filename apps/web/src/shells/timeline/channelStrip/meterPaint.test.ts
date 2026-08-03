/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  clearMeterPaintTargets,
  meterPaintKey,
  readMeterPaintDisplay,
  registerMeterColumn,
  setMeterPaintTarget,
  tickMeterPaint,
} from "./meterPaint.js";

function fakeColumn() {
  const dim = { style: { height: "" } } as HTMLElement;
  const track = { dataset: {} as DOMStringMap } as HTMLElement;
  return { dim, track };
}

describe("meterPaint", () => {
  afterEach(() => {
    clearMeterPaintTargets();
  });

  it("builds stable paint keys", () => {
    expect(meterPaintKey("track", "a", "l")).toBe("track:a:l");
    expect(meterPaintKey("master", "stereo", "r")).toBe("master:stereo:r");
  });

  it("applies ballistics toward a hot target across ticks", () => {
    const col = fakeColumn();
    const key = meterPaintKey("track", "t1", "l");
    const unregister = registerMeterColumn(key, col);
    setMeterPaintTarget(key, -3);
    tickMeterPaint(0.02);
    const mid = readMeterPaintDisplay(key);
    expect(mid).toBeGreaterThan(-60);
    expect(mid).toBeLessThanOrEqual(-3);
    expect(col.dim.style.height).toMatch(/%$/);
    expect(col.track.dataset.band).toMatch(/safe|warn|clip/);
    tickMeterPaint(0.5);
    expect(readMeterPaintDisplay(key)).toBeCloseTo(-3, 0);
    expect(col.track.dataset.band).toBe("warn");
    unregister();
  });

  it("releases slowly after a quiet target", () => {
    const col = fakeColumn();
    const key = meterPaintKey("bus", "b1", "l");
    registerMeterColumn(key, col);
    setMeterPaintTarget(key, -3);
    tickMeterPaint(1);
    setMeterPaintTarget(key, -50);
    tickMeterPaint(0.02);
    const after = readMeterPaintDisplay(key);
    expect(after).toBeLessThan(-3);
    expect(after).toBeGreaterThan(-50);
  });
});
