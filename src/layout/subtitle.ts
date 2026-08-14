export type SubtitleAlignment = "center" | "left" | "right";
export type SubtitlePosition = "bottom-center" | "top-center" | "screen-center" | "bottom-left" | "custom";
export interface SubtitleLayoutSettings { subtitleAlignment: SubtitleAlignment; subtitlePosition: SubtitlePosition; subtitleX: number; subtitleY: number }
export function isSubtitleAlignment(value: unknown): value is SubtitleAlignment { return value === "center" || value === "left" || value === "right"; }
export function isSubtitlePosition(value: unknown): value is SubtitlePosition {
  return value === "bottom-center" || value === "top-center" || value === "screen-center" || value === "bottom-left" || value === "custom";
}
export function applySubtitleLayout(element: HTMLElement, settings: Readonly<SubtitleLayoutSettings>): void {
  element.dataset.alignment = settings.subtitleAlignment; element.dataset.position = settings.subtitlePosition;
  element.style.setProperty("--subtitle-x", `${settings.subtitleX}px`); element.style.setProperty("--subtitle-y", `${settings.subtitleY}px`);
}
