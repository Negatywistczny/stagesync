import { describe, expect, it } from "vitest";
import { extFromName, mimeForExt } from "./assets-helpers.js";

describe("assets-helpers", () => {
  it("extFromName lowercases and defaults to .bin", () => {
    expect(extFromName("Kick.WAV")).toBe(".wav");
    expect(extFromName("noext")).toBe(".bin");
  });

  it("mimeForExt maps known audio and MusicXML extensions", () => {
    expect(mimeForExt(".mp3")).toBe("audio/mpeg");
    expect(mimeForExt(".wav")).toBe("audio/wav");
    expect(mimeForExt(".aif")).toBe("audio/aiff");
    expect(mimeForExt(".flac")).toBe("audio/flac");
    expect(mimeForExt(".mxl")).toBe("application/vnd.recordare.musicxml");
    expect(mimeForExt(".musicxml")).toBe(
      "application/vnd.recordare.musicxml+xml",
    );
    expect(mimeForExt(".unknown")).toBe("application/octet-stream");
  });
});
