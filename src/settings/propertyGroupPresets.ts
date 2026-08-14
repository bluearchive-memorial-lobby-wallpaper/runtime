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
