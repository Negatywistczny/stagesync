import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clampScoreOctave,
  fetchScoreBlob,
  scoreInstrumentId,
  scoreOctaveToSemitones,
} from "./scoreOsmd.js";

describe("scoreOsmd parts/octave helpers", () => {
  it("builds stable part ids", () => {
    expect(scoreInstrumentId({ Name: "Violin" }, 0)).toBe("Violin::0");
    expect(scoreInstrumentId({ PartAbbreviation: "Vl" }, 2)).toBe("Vl::2");
  });

  it("clamps score octave to -1..1", () => {
    expect(clampScoreOctave(-9)).toBe(-1);
    expect(clampScoreOctave(0)).toBe(0);
    expect(clampScoreOctave(3)).toBe(1);
    expect(scoreOctaveToSemitones(-1)).toBe(-12);
    expect(scoreOctaveToSemitones(1)).toBe(12);
  });
});

describe("fetchScoreBlob", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns response.blob() (not text) so MXL ZIP bytes stay intact", async () => {
    // ZIP local file header magic — same bytes OSMD/JSZip expect for .mxl
    const mxlBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01]);
    const blob = new Blob([mxlBytes], {
      type: "application/vnd.recordare.musicxml",
    });
    const blobSpy = vi.fn(async () => blob);
    const textSpy = vi.fn(async () => {
      throw new Error("must not decode MXL as text");
    });
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      blob: blobSpy,
      text: textSpy,
    })) as unknown as typeof fetch;

    const got = await fetchScoreBlob(
      "/api/projects/p1/assets/a1/file",
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith("/api/projects/p1/assets/a1/file");
    expect(blobSpy).toHaveBeenCalledOnce();
    expect(textSpy).not.toHaveBeenCalled();
    expect(got).toBe(blob);
    expect([...new Uint8Array(await got.arrayBuffer())]).toEqual([...mxlBytes]);
  });

  it("throws a Polish error on non-OK HTTP", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 404,
      blob: vi.fn(),
      text: vi.fn(),
    })) as unknown as typeof fetch;

    await expect(
      fetchScoreBlob("/api/projects/p1/assets/missing/file", fetchImpl),
    ).rejects.toThrow(/HTTP 404/);
  });
});
