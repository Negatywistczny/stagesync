import { describe, it, expect } from "vitest";
import {
  crc32,
  buildStoreZip,
  parseZipArchive,
  type ZipEntry,
} from "./diagnostics-zip.js";

describe("diagnostics-zip", () => {
  it("crc32 calculates correct checksum", () => {
    const data = Buffer.from("hello world", "utf8");
    const checksum = crc32(data);
    expect(checksum).toBe(0xd4a1185);
  });

  it("builds and parses uncompressed STORE zip archive", () => {
    const entries: ZipEntry[] = [
      { name: "test.txt", data: Buffer.from("Hello StageSync!", "utf8") },
      {
        name: "data/config.json",
        data: Buffer.from('{"key":"value"}', "utf8"),
      },
    ];

    const zipBuffer = buildStoreZip(entries);
    expect(zipBuffer.length).toBeGreaterThan(50);

    const parsed = parseZipArchive(zipBuffer);
    expect(parsed.length).toBe(2);
    expect(parsed[0]?.name).toBe("test.txt");
    expect(parsed[0]?.data.toString("utf8")).toBe("Hello StageSync!");
    expect(parsed[1]?.name).toBe("data/config.json");
    expect(parsed[1]?.data.toString("utf8")).toBe('{"key":"value"}');
  });

  it("throws error for corrupt/short ZIP buffer", () => {
    expect(() => parseZipArchive(Buffer.from("short"))).toThrow(/za krótkie/i);
    expect(() => parseZipArchive(Buffer.alloc(30))).toThrow(/brak EOCD/i);
  });
});
