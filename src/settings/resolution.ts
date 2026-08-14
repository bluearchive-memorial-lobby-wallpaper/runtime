export const MODEL_RESOLUTIONS = {
  "2k": { label: "2K", textureScale: 1 },
  "4k": { label: "4K", textureScale: 2 },
  "8k": { label: "8K", textureScale: 4 },
} as const;

export type ModelResolution = keyof typeof MODEL_RESOLUTIONS;

export function isModelResolution(value: unknown): value is ModelResolution {
  return typeof value === "string" && value in MODEL_RESOLUTIONS;
}

export type RenderResolution = "720p" | "1080p" | "1440p" | "2160p";

export const RENDER_RESOLUTIONS: Record<
  RenderResolution,
  { label: string; referenceWidth: number; height: number }
> = {
  "720p": { label: "720P", referenceWidth: 1280, height: 720 },
  "1080p": { label: "1080P", referenceWidth: 1920, height: 1080 },
  "1440p": { label: "2K", referenceWidth: 2560, height: 1440 },
  "2160p": { label: "4K", referenceWidth: 3840, height: 2160 },
};

export function isRenderResolution(value: unknown): value is RenderResolution {
  return value === "720p" || value === "1080p" || value === "1440p" || value === "2160p";
}
