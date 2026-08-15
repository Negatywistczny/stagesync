import { describe, expect, it } from "vitest";
import { HEXSPEAK } from "./hexspeak.js";
import {
  HealthResponseSchema,
  PROTOCOL_VERSION,
  UiHashFileSchema,
  UiManifestSchema,
} from "./schema.js";

describe("HEXSPEAK Easter Eggs & Magic Constants", () => {
  it("defines standard Hexspeak values with valid hex strings", () => {
    expect(HEXSPEAK.DEADBEEF).toBe("0xDEADBEEF");
    expect(HEXSPEAK.DEAD_BEEF_HASH).toBe("deadbeef");

    expect(HEXSPEAK.CAFEBABE).toBe("0xCAFEBABE");
    expect(HEXSPEAK.CAFE_BABE_HASH).toBe("cafebabe");

    expect(HEXSPEAK.BAADF00D).toBe("0xBAADF00D");
    expect(HEXSPEAK.BAAD_F00D_HASH).toBe("baadf00d");

    expect(HEXSPEAK.C0FFEE).toBe("0x00C0FFEE");
    expect(HEXSPEAK.C0FFEE_HASH).toBe("00c0ffee");

    expect(HEXSPEAK.STAGE).toBe("0x00057A6E");
    expect(HEXSPEAK.STAGE_HASH).toBe("00057a6e");

    expect(HEXSPEAK.FEEDFACE).toBe("0xFEEDFACE");
    expect(HEXSPEAK.FEED_FACE_HASH).toBe("feedface");

    expect(HEXSPEAK.DEFEC8ED).toBe("0xDEFEC8ED");
    expect(HEXSPEAK.DEFEC8ED_HASH).toBe("defec8ed");
  });

  it("validates that all hex constants match hexadecimal formatting", () => {
    const hexPrefixRegex = /^0x[0-9A-Fa-f]+$/;
    const hashRegex = /^[0-9a-f]+$/;

    for (const [key, val] of Object.entries(HEXSPEAK)) {
      if (key.endsWith("_HASH")) {
        expect(val).toMatch(hashRegex);
      } else {
        expect(val).toMatch(hexPrefixRegex);
      }
    }
  });

  it("works seamlessly as valid UI hashes across schemas", () => {
    const hashes = [
      HEXSPEAK.DEAD_BEEF_HASH,
      HEXSPEAK.CAFE_BABE_HASH,
      HEXSPEAK.BAAD_F00D_HASH,
      HEXSPEAK.C0FFEE_HASH,
      HEXSPEAK.STAGE_HASH,
    ];

    for (const hash of hashes) {
      const parsedHash = UiHashFileSchema.parse({
        protocolVersion: PROTOCOL_VERSION,
        uiHash: hash,
      });
      expect(parsedHash.uiHash).toBe(hash);

      const parsedManifest = UiManifestSchema.parse({
        protocolVersion: PROTOCOL_VERSION,
        uiHash: hash,
        assets: [{ path: "/index.html", hash, size: 42 }],
      });
      expect(parsedManifest.uiHash).toBe(hash);

      const parsedHealth = HealthResponseSchema.parse({
        ok: true,
        service: "stagesync-server",
        version: "5.1.3",
        protocolVersion: PROTOCOL_VERSION,
        uiHash: hash,
      });
      expect(parsedHealth.uiHash).toBe(hash);
    }
  });
});
