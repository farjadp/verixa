// ============================================================================
// Content Pipeline — admin-editable config (PlatformSetting rows)
// Every key has a safe default. Real publishing is OFF unless an admin sets
// `content_autopublish_enabled` to "true".
// ============================================================================
import { z } from "zod";
import { parseLanguageSetting, type LanguageSetting } from "./language";

export const CHANNELS = ["linkedin", "twitter", "facebook", "telegram"] as const;
export type Channel = (typeof CHANNELS)[number];

export const STRICTNESS_LEVELS = ["lenient", "standard", "strict"] as const;
export type Strictness = (typeof STRICTNESS_LEVELS)[number];

/** Minimum reviewer quality score (0-100) a draft needs to pass the gate. */
export const STRICTNESS_MIN_SCORE: Record<Strictness, number> = {
  lenient: 60,
  standard: 70,
  strict: 80,
};

export const CONFIG_KEYS = {
  language: "content_language",
  piecesPerDay: "content_pieces_per_day",
  autopublish: "content_autopublish_enabled",
  strictness: "content_review_strictness",
  channel: (c: Channel) => `content_channel_${c}`,
} as const;

export const ALL_CONFIG_KEYS: string[] = [
  CONFIG_KEYS.language,
  CONFIG_KEYS.piecesPerDay,
  CONFIG_KEYS.autopublish,
  CONFIG_KEYS.strictness,
  ...CHANNELS.map(CONFIG_KEYS.channel),
];

export const CONFIG_DEFAULTS: Record<string, string> = {
  [CONFIG_KEYS.language]: "en",
  [CONFIG_KEYS.piecesPerDay]: "2",
  [CONFIG_KEYS.autopublish]: "false",
  [CONFIG_KEYS.strictness]: "standard",
  ...Object.fromEntries(CHANNELS.map((c) => [CONFIG_KEYS.channel(c), "false"])),
};

export const MAX_PIECES_PER_DAY = 10;

export interface PipelineConfig {
  language: LanguageSetting;
  piecesPerDay: number;
  autopublish: boolean;
  strictness: Strictness;
  minQualityScore: number;
  channels: Record<Channel, boolean>;
}

const bool = (v: string | undefined) => (v ?? "").trim().toLowerCase() === "true";

/** Pure: turn a key→value map (from PlatformSetting) into a typed config with defaults. */
export function parseConfig(values: Record<string, string | undefined>): PipelineConfig {
  const get = (k: string) => values[k] ?? CONFIG_DEFAULTS[k];

  const n = parseInt(get(CONFIG_KEYS.piecesPerDay) ?? "2", 10);
  const piecesPerDay = Number.isFinite(n) ? Math.min(Math.max(n, 0), MAX_PIECES_PER_DAY) : 2;

  const s = (get(CONFIG_KEYS.strictness) ?? "standard").trim().toLowerCase();
  const strictness: Strictness = (STRICTNESS_LEVELS as readonly string[]).includes(s) ? (s as Strictness) : "standard";

  const channels = Object.fromEntries(CHANNELS.map((c) => [c, bool(get(CONFIG_KEYS.channel(c)))])) as Record<
    Channel,
    boolean
  >;

  return {
    language: parseLanguageSetting(get(CONFIG_KEYS.language)),
    piecesPerDay,
    autopublish: bool(get(CONFIG_KEYS.autopublish)),
    strictness,
    minQualityScore: STRICTNESS_MIN_SCORE[strictness],
    channels,
  };
}

/** Minimal prisma surface needed to read config — keeps this testable. */
export interface SettingsReader {
  platformSetting: {
    findMany(args: { where: { key: { in: string[] } }; take: number }): Promise<{ key: string; value: string }[]>;
  };
}

export async function loadConfig(db: SettingsReader): Promise<PipelineConfig> {
  const rows = await db.platformSetting.findMany({
    where: { key: { in: ALL_CONFIG_KEYS } },
    take: ALL_CONFIG_KEYS.length,
  });
  return parseConfig(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

/** zod schema for the admin settings form. Values are stored as strings in PlatformSetting. */
export const ConfigUpdateSchema = z
  .object({
    language: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z]{2}(\+[a-z]{2})?$/, "Use a language code like en, fa, or en+fa"),
    piecesPerDay: z.number().int().min(0).max(MAX_PIECES_PER_DAY),
    autopublish: z.boolean(),
    strictness: z.enum(STRICTNESS_LEVELS),
    channels: z.object({
      linkedin: z.boolean(),
      twitter: z.boolean(),
      facebook: z.boolean(),
      telegram: z.boolean(),
    }),
  })
  .strict();

export type ConfigUpdate = z.infer<typeof ConfigUpdateSchema>;

export function configUpdateToSettings(u: ConfigUpdate): { key: string; value: string }[] {
  return [
    { key: CONFIG_KEYS.language, value: u.language },
    { key: CONFIG_KEYS.piecesPerDay, value: String(u.piecesPerDay) },
    { key: CONFIG_KEYS.autopublish, value: String(u.autopublish) },
    { key: CONFIG_KEYS.strictness, value: u.strictness },
    ...CHANNELS.map((c) => ({ key: CONFIG_KEYS.channel(c), value: String(u.channels[c]) })),
  ];
}
