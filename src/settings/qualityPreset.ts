import type { ModelResolution, RenderResolution } from "./resolution.js";

export type QualityPreset = "default" | "2k" | "4k" | "maximum" | "custom";

export interface QualityPresetSettings {
  renderResolution: RenderResolution;
  modelResolution: ModelResolution;
  fpsLimit: number;
}

export const QUALITY_PRESETS: Record<Exclude<QualityPreset, "custom">, QualityPresetSettings> = {
  default: { renderResolution: "1080p", modelResolution: "2k", fpsLimit: 60 },
  "2k": { renderResolution: "1440p", modelResolution: "4k", fpsLimit: 60 },
  "4k": { renderResolution: "2160p", modelResolution: "4k", fpsLimit: 60 },
  maximum: { renderResolution: "2160p", modelResolution: "8k", fpsLimit: 160 },
};

export function isQualityPreset(value: unknown): value is QualityPreset {
  return value === "default" || value === "2k" || value === "4k" || value === "maximum" || value === "custom";
}
