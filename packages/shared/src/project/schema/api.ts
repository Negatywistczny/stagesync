import { z } from "zod";
import {
  AppearanceProfileIdSchema,
  normalizeAppearanceProfile,
} from "../../ui-helpers/theme-default.js";

/**
 * Wire / WebSocket frame compatibility for Offline-First shells ([#692](https://github.com/kacperczeczot/stagesync/issues/692)).
 * Bump only on breaking transport/API frame changes — not on CSS/JS UI refreshes.
 */
export const PROTOCOL_VERSION = 1 as const;

export const HealthResponseSchema = z
  .object({
    ok: z.literal(true),
    service: z.literal("stagesync-server"),
    version: z.string(),
    /** LAN discovery title advertised via mDNS TXT / Admin Host. */
    hostname: z.string().min(1).optional(),
    /** WS/API frame compatibility; shells hard-fallback to Remote Mode on mismatch. */
    protocolVersion: z.number().int().positive(),
    /** Content hash of served full `apps/web` dist (`none` when host has no static UI). */
    uiHash: z.string().min(1),
    /** Performer (Client-only) UI hash; optional when host has no role bundle. */
    uiHashPerformer: z.string().min(1).optional(),
    /** Console (Admin+Timeline) UI hash; optional when host has no role bundle. */
    uiHashConsole: z.string().min(1).optional(),
    /**
     * Host default theme when the client has no localStorage theme yet
     * (`STAGESYNC_THEME_DEFAULT`). Profile IDs only. Omitted when unset.
     */
    themeDefault: z.preprocess((v) => {
      if (v == null || v === "") return undefined;
      return normalizeAppearanceProfile(String(v)) ?? v;
    }, AppearanceProfileIdSchema.optional()),
  })
  .strict();

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/** One hashed file in the UI asset tree (paths start with `/`). */
export const UiManifestAssetSchema = z
  .object({
    path: z.string().min(1),
    hash: z.string().min(1),
    size: z.number().int().nonnegative(),
  })
  .strict();

export type UiManifestAsset = z.infer<typeof UiManifestAssetSchema>;

/** `GET /api/ui-manifest` — enough for full UI sync / verify after zip apply. */
export const UiManifestSchema = z
  .object({
    protocolVersion: z.number().int().positive(),
    uiHash: z.string().min(1),
    assets: z.array(UiManifestAssetSchema),
  })
  .strict();

export type UiManifest = z.infer<typeof UiManifestSchema>;

/** Emitted by web build as `dist/ui-hash.json` (subset of manifest). */
export const UiHashFileSchema = z
  .object({
    protocolVersion: z.number().int().positive(),
    uiHash: z.string().min(1),
  })
  .strict();

export type UiHashFile = z.infer<typeof UiHashFileSchema>;

export const ApiErrorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  details: z.array(ApiErrorDetailSchema).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const StageMessageBodySchema = z
  .object({
    text: z.string().min(1).max(200),
    roles: z
      .array(z.enum(["karaoke", "grid", "score", "drums"]))
      .max(4)
      .optional(),
    /** Wall-clock TTL; `0` = infinite (UI ∞). Omit → server default 6 s. */
    ttlMs: z.number().int().nonnegative().max(86_400_000).optional(),
    priority: z.enum(["normal", "alert"]).optional(),
  })
  .strict();

export type StageMessageBody = z.infer<typeof StageMessageBodySchema>;

/** Inbound WS presence hello from Client shells (`/ws/transport`). */
export const ClientHelloMessageSchema = z
  .object({
    type: z.literal("client_hello"),
    displayName: z.string().max(80).optional(),
    roles: z
      .array(z.enum(["karaoke", "grid", "score", "drums", "timeline"]))
      .max(2)
      .optional(),
    latencyMs: z.number().finite().nonnegative().nullable().optional(),
  })
  .strict();

export type ClientHelloMessage = z.infer<typeof ClientHelloMessageSchema>;

/** GET /api/system/update-status response */
export const UpdateStatusSchema = z
  .object({
    current: z.string(),
    latest: z.string().nullable(),
    updateAvailable: z.boolean(),
    /** null when check succeeded; otherwise operator-facing reason (auth / network / empty) */
    error: z.string().max(500).nullable().optional(),
    /** True only when Watchtower env is set — UI must not offer apply otherwise. */
    applyAvailable: z.boolean().optional(),
    updateChannel: z.string().optional(),
    updateMode: z.enum(["desktop", "apk", "docker", "manual"]).optional(),
    autoUpdateDisabled: z.boolean().optional(),
  })
  .strict();

export type UpdateStatus = z.infer<typeof UpdateStatusSchema>;

/** POST /api/system/apply-update body */
export const ApplyUpdateBodySchema = z
  .object({
    target: z.enum(["host"]),
  })
  .strict();

export type ApplyUpdateBody = z.infer<typeof ApplyUpdateBodySchema>;

/** POST /api/system/restore — single `.bak` / `.zip`, or bulk `.bak` paths. */
export const RestoreBackupBodySchema = z.union([
  z
    .object({
      path: z.string().min(1).max(1024),
      /** Must be true — destructive overwrite of live file(s). */
      confirm: z.literal(true),
    })
    .strict(),
  z
    .object({
      paths: z.array(z.string().min(1).max(1024)).min(1).max(64),
      confirm: z.literal(true),
    })
    .strict(),
]);

export type RestoreBackupBody = z.infer<typeof RestoreBackupBodySchema>;

/** PUT /api/system/settings — managed .env values from Admin Ustawienia. */
export const PutServerSettingsBodySchema = z
  .object({
    values: z.record(
      z.string().min(1).max(64),
      z.union([z.string().max(500), z.boolean(), z.number(), z.null()]),
    ),
  })
  .strict();

export type PutServerSettingsBody = z.infer<typeof PutServerSettingsBodySchema>;

/** MIDI port listed by the host (apps/server). */
export const MidiPortSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  direction: z.enum(["input", "output"]),
});

export type MidiPort = z.infer<typeof MidiPortSchema>;

/** MIDI channel 0–15 (API / wire); UI shows 1–16. */
export const MidiChannelSchema = z.number().int().min(0).max(15);

/** Runtime selection + feature flags for Host MIDI. */
export const MidiHostConfigSchema = z
  .object({
    inputId: z.string().min(1).nullable(),
    outputId: z.string().min(1).nullable(),
    /** Emit MIDI clock / start / stop / SPP on the selected output from transport SSOT. */
    clockOutEnabled: z.boolean(),
    /**
     * Program Change IN filter. `null` = Omni (all channels); `0…15` = single channel.
     * Omitted → Omni.
     */
    inputChannel: MidiChannelSchema.nullable().default(null),
    /**
     * Program Change OUT channel (`0` = Channel 1 in UI).
     * Omitted → 0.
     */
    outputChannel: MidiChannelSchema.default(0),
  })
  .strict();

export type MidiHostConfig = z.infer<typeof MidiHostConfigSchema>;

export const PutMidiHostConfigBodySchema = z
  .object({
    inputId: z.string().min(1).nullable().optional(),
    outputId: z.string().min(1).nullable().optional(),
    clockOutEnabled: z.boolean().optional(),
    inputChannel: MidiChannelSchema.nullable().optional(),
    outputChannel: MidiChannelSchema.optional(),
  })
  .strict();

export type PutMidiHostConfigBody = z.infer<typeof PutMidiHostConfigBodySchema>;

/** Rates are approximate messages (or beats) in the last ~1s. */
export const MidiHostRatesSchema = z
  .object({
    clockPerSec: z.number().nonnegative(),
    sppPerSec: z.number().nonnegative(),
    pcPerSec: z.number().nonnegative(),
    beatToWsPerSec: z.number().nonnegative(),
  })
  .strict();

export type MidiHostRates = z.infer<typeof MidiHostRatesSchema>;

/** GET /api/midi — Admin Host status. */
export const MidiHostStatusSchema = z
  .object({
    available: z.boolean(),
    backend: z.enum(["native", "mock", "none"]),
    config: MidiHostConfigSchema,
    inputs: z.array(MidiPortSchema).max(128),
    outputs: z.array(MidiPortSchema).max(128),
    rates: MidiHostRatesSchema,
    /** True while transport is playing and clock-out timer is armed. */
    clockOutActive: z.boolean(),
    lastError: z.string().nullable(),
  })
  .strict();

export type MidiHostStatus = z.infer<typeof MidiHostStatusSchema>;

/** Push surface: where the token was registered (#810). */
export const PushPlatformSchema = z.enum([
  "android-performer",
  "android-console",
  "web",
  "desktop",
]);

export type PushPlatform = z.infer<typeof PushPlatformSchema>;

/** Android / WebPush channel ids (must match native channel strings). */
export const PushChannelSchema = z.enum(["critical_updates", "announcements"]);

export type PushChannel = z.infer<typeof PushChannelSchema>;

/** Client → host: register FCM / WebPush token for this device. */
export const PushTokenRegisterBodySchema = z
  .object({
    token: z.string().min(8).max(4096),
    platform: PushPlatformSchema,
    /** Optional stable device label (not a secret). */
    deviceLabel: z.string().max(120).optional(),
  })
  .strict();

export type PushTokenRegisterBody = z.infer<typeof PushTokenRegisterBodySchema>;

/** Client → host: remove a previously registered token. */
export const PushTokenUnregisterBodySchema = z
  .object({
    token: z.string().min(8).max(4096),
  })
  .strict();

export type PushTokenUnregisterBody = z.infer<
  typeof PushTokenUnregisterBodySchema
>;

/** Public push config for clients (no private keys). */
export const PushPublicConfigSchema = z
  .object({
    /** WebPush VAPID public key (base64url), when host can accept web subscriptions. */
    vapidPublicKey: z.string().min(1).optional(),
    /** True when Android FCM is expected (operator docs / build with google-services). */
    fcmAvailable: z.boolean(),
  })
  .strict();

export type PushPublicConfig = z.infer<typeof PushPublicConfigSchema>;
