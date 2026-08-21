import type { SubtitleAlignment, SubtitlePosition } from "../layout/subtitle.js";

export type VoiceLocale = "ja" | "zh-cn" | "ko";
export type SubtitleLocale = "zh-cn" | "ja" | "ko" | "en";

export type PositionPreset = "default" | "custom";
export type PanelPositionPreset = "default" | "custom";
export type InteractionPreset = "default" | "custom";
export type DialogueLanguagePreset = "zh-cn" | "ja" | "ko" | "en" | "custom";
export type DebugPreset = "off" | "panel" | "all" | "custom";

export interface PositionPresetSettings {
  modelScale: number;
  modelX: number;
  modelY: number;
  modelRotation: number;
}

export interface PanelPositionPresetSettings {
  panelScale: number;
  panelX: number;
  panelY: number;
}

export interface InteractionPresetSettings {
  introAnimation: boolean;
  interactionsEnabled: boolean;
  mouseTracking: boolean;
  headPatting: boolean;
  voiceEnabled: boolean;
}

export interface DialogueLanguagePresetSettings {
  voiceLocale: VoiceLocale;
  subtitlesEnabled: boolean;
  primarySubtitleLocale: SubtitleLocale;
  secondarySubtitlesEnabled: boolean;
  secondarySubtitleLocale: SubtitleLocale;
  subtitleAlignment: SubtitleAlignment;
  subtitlePosition: SubtitlePosition;
  subtitleX: number;
  subtitleY: number;
}

export interface DebugPresetSettings {
  debugPanelEnabled: boolean;
  drawHitboxes: boolean;
}

export const POSITION_PRESETS: Record<"default", PositionPresetSettings> = {
  default: { modelScale: 0.8, modelX: 0, modelY: 0, modelRotation: 0 },
};

export const PANEL_POSITION_PRESETS: Record<
  "default",
  PanelPositionPresetSettings
> = {
  default: { panelScale: 1, panelX: 0, panelY: 0 },
};

export const INTERACTION_PRESETS: Record<"default", InteractionPresetSettings> = {
  default: {
    introAnimation: true,
    interactionsEnabled: true,
    mouseTracking: true,
    headPatting: true,
    voiceEnabled: true,
  },
};

export const DIALOGUE_LANGUAGE_PRESETS: Record<
  Exclude<DialogueLanguagePreset, "custom">,
  DialogueLanguagePresetSettings
> = {
  "zh-cn": {
    voiceLocale: "zh-cn",
    subtitlesEnabled: true,
    primarySubtitleLocale: "zh-cn",
    secondarySubtitlesEnabled: false,
    secondarySubtitleLocale: "ja",
    subtitleAlignment: "center",
    subtitlePosition: "bottom-center",
    subtitleX: 0,
    subtitleY: 0,
  },
  ja: {
    voiceLocale: "ja",
    subtitlesEnabled: true,
    primarySubtitleLocale: "ja",
    secondarySubtitlesEnabled: false,
    secondarySubtitleLocale: "zh-cn",
    subtitleAlignment: "center",
    subtitlePosition: "bottom-center",
    subtitleX: 0,
    subtitleY: 0,
  },
  ko: {
    voiceLocale: "ko",
    subtitlesEnabled: true,
    primarySubtitleLocale: "ko",
    secondarySubtitlesEnabled: false,
    secondarySubtitleLocale: "ja",
    subtitleAlignment: "center",
    subtitlePosition: "bottom-center",
    subtitleX: 0,
    subtitleY: 0,
  },
  en: {
    voiceLocale: "ja",
    subtitlesEnabled: true,
    primarySubtitleLocale: "en",
    secondarySubtitlesEnabled: false,
    secondarySubtitleLocale: "ja",
    subtitleAlignment: "center",
    subtitlePosition: "bottom-center",
    subtitleX: 0,
    subtitleY: 0,
  },
};

export const DEBUG_PRESETS: Record<
  Exclude<DebugPreset, "custom">,
  DebugPresetSettings
> = {
  off: {
    debugPanelEnabled: false,
    drawHitboxes: false,
  },
  panel: {
    debugPanelEnabled: true,
    drawHitboxes: false,
  },
  all: {
    debugPanelEnabled: true,
    drawHitboxes: true,
  },
};

export function isPositionPreset(value: unknown): value is PositionPreset {
  return value === "default" || value === "custom";
}

export function isPanelPositionPreset(
  value: unknown,
): value is PanelPositionPreset {
  return value === "default" || value === "custom";
}

export function isInteractionPreset(value: unknown): value is InteractionPreset {
  return value === "default" || value === "custom";
}

export function isDialogueLanguagePreset(
  value: unknown,
): value is DialogueLanguagePreset {
  return (
    value === "zh-cn" ||
    value === "ja" ||
    value === "ko" ||
    value === "en" ||
    value === "custom"
  );
}

export function isDebugPreset(value: unknown): value is DebugPreset {
  return value === "off" || value === "panel" || value === "all" || value === "custom";
}

// ---------------------------------------------------------------------------
// Dialogue language availability.
//
// Mirrors the pipeline's applyLanguageUiOptions
// (pipeline/src/portfolio/resource-prepare.mjs): a preset is selectable only
// when the wallpaper has real data for it. Chinese and Korean need both voice
// and subtitles, English needs only subtitles; Japanese and custom are always
// present. When the definition does not declare locales (older builds), voice
// falls back to the full set and subtitles are inferred from non-empty
// dialogue text keys.
// ---------------------------------------------------------------------------

const ALL_VOICE_LOCALES: readonly VoiceLocale[] = ["zh-cn", "ja", "ko"];
const ALL_SUBTITLE_LOCALES: readonly SubtitleLocale[] = ["zh-cn", "ja", "ko", "en"];

// The subset of a wallpaper definition these resolvers read. Deliberately
// looser than WallpaperDefinition so callers are not forced to match its full
// (generic) shape.
export interface DialogueLanguageSource {
  readonly audio?: {
    readonly voiceLocales?: readonly string[];
    readonly subtitleLocales?: readonly string[];
  };
  readonly dialogues?: readonly {
    readonly lines: readonly { readonly text: Readonly<Record<string, string>> }[];
  }[];
}

export function resolveAvailableVoiceLocales(
  definition: DialogueLanguageSource,
): string[] {
  if (definition.audio?.voiceLocales !== undefined) return [...definition.audio.voiceLocales];
  return [...ALL_VOICE_LOCALES];
}

export function resolveAvailableSubtitleLocales(
  definition: DialogueLanguageSource,
): string[] {
  if (definition.audio?.subtitleLocales !== undefined) return [...definition.audio.subtitleLocales];
  const inferred = new Set<string>();
  for (const dialogue of definition.dialogues ?? []) {
    for (const line of dialogue.lines) {
      for (const [locale, text] of Object.entries(line.text)) {
        if (typeof text === "string" && text.trim().length > 0) inferred.add(locale);
      }
    }
  }
  return inferred.size > 0 ? [...inferred] : [...ALL_SUBTITLE_LOCALES];
}

export function resolveDialoguePresetLocales(
  voiceLocales: readonly string[],
  subtitleLocales: readonly string[],
): DialogueLanguagePreset[] {
  const voice = new Set(voiceLocales);
  const subtitles = new Set(subtitleLocales);
  const presets: DialogueLanguagePreset[] = [];
  if (voice.has("zh-cn") && subtitles.has("zh-cn")) presets.push("zh-cn");
  presets.push("ja");
  if (voice.has("ko") && subtitles.has("ko")) presets.push("ko");
  if (subtitles.has("en")) presets.push("en");
  presets.push("custom");
  return presets;
}

export function resolveDefaultDialogueLocale(
  voiceLocales: readonly string[],
  subtitleLocales: readonly string[],
): string {
  return (
    voiceLocales.includes("zh-cn") && subtitleLocales.includes("zh-cn") ? "zh-cn" : "ja"
  );
}
