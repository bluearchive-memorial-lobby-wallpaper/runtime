import { applySubtitleLayout, type SubtitleAlignment, type SubtitlePosition } from "../layout/subtitle.js";

export interface SubtitleLine<Locale extends string = string> { readonly text: Readonly<Record<Locale, string>> }
export type SubtitleLineResolver<Locale extends string = string> = (eventId: string) => SubtitleLine<Locale> | undefined;
export interface SubtitlePresentation { primaryText: string; secondaryText: string | null }

export function resolveSubtitlePresentation<Locale extends string>(resolveLine: SubtitleLineResolver<Locale>, eventId: string,
  enabled: boolean, primaryLocale: Locale, secondaryEnabled: boolean, secondaryLocale: Locale): SubtitlePresentation | null {
  const line = resolveLine(eventId); if (!enabled || !line) return null;
  return { primaryText: line.text[primaryLocale], secondaryText: secondaryEnabled && secondaryLocale !== primaryLocale ? line.text[secondaryLocale] : null };
}

export class SubtitlePresenter<Locale extends string = string> {
  private primaryLocale: Locale; private secondaryLocale: Locale; private secondaryEnabled = false;
  private subtitleAlignment: SubtitleAlignment = "center"; private subtitlePosition: SubtitlePosition = "bottom-center";
  private subtitleX = 0; private subtitleY = 0; private enabled = true; private eventId: string | null = null;
  constructor(private readonly element: HTMLElement, private readonly primaryElement: HTMLElement,
    private readonly secondaryElement: HTMLElement, private readonly resolveLine: SubtitleLineResolver<Locale>, defaults: { primaryLocale: Locale; secondaryLocale: Locale }) {
    this.primaryLocale = defaults.primaryLocale; this.secondaryLocale = defaults.secondaryLocale;
  }
  configure(enabled: boolean, primaryLocale: Locale, secondaryEnabled: boolean, secondaryLocale: Locale,
    subtitleAlignment: SubtitleAlignment, subtitlePosition: SubtitlePosition, subtitleX: number, subtitleY: number): void {
    Object.assign(this, { enabled, primaryLocale, secondaryEnabled, secondaryLocale, subtitleAlignment, subtitlePosition, subtitleX, subtitleY });
    applySubtitleLayout(this.element, { subtitleAlignment, subtitlePosition, subtitleX, subtitleY });
    if (this.eventId) this.show(this.eventId); else this.element.hidden = true;
  }
  show(eventId: string): void {
    this.eventId = eventId;
    const value = resolveSubtitlePresentation(this.resolveLine, eventId, this.enabled, this.primaryLocale, this.secondaryEnabled, this.secondaryLocale);
    if (!value) { this.element.hidden = true; return; }
    this.primaryElement.textContent = value.primaryText; this.secondaryElement.textContent = value.secondaryText ?? "";
    this.secondaryElement.hidden = value.secondaryText === null; this.element.hidden = false;
  }
  hide(eventId?: string): void { if (!eventId || this.eventId?.toLowerCase() === eventId.toLowerCase()) { this.eventId = null; this.element.hidden = true; } }
  getSnapshot() { return { eventId: this.eventId, primaryText: this.primaryElement.textContent,
    secondaryText: this.secondaryElement.hidden ? null : this.secondaryElement.textContent, visible: !this.element.hidden,
    primaryLocale: this.primaryLocale, secondaryLocale: this.secondaryLocale, enabled: this.enabled, secondaryEnabled: this.secondaryEnabled,
    subtitleAlignment: this.subtitleAlignment, subtitlePosition: this.subtitlePosition, subtitleX: this.subtitleX, subtitleY: this.subtitleY }; }
}
