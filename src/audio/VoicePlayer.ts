export interface VoicePlayerCallbacks {
  onEnded: (eventId: string) => void;
  onError: (message: string) => void;
}
export type VoicePathResolver<Locale extends string = string> = (eventId: string, locale: Locale) => string;

export class VoicePlayer<Locale extends string = string> {
  private current?: { eventId: string; locale: Locale; audio: HTMLAudioElement };
  private primed?: { eventId: string; locale: Locale; audio: HTMLAudioElement };
  private volume = 0.7; private enabled = true; private pausedByHost = false;
  constructor(private readonly resolvePath: VoicePathResolver<Locale>, private readonly callbacks: VoicePlayerCallbacks) {}
  configure(enabled: boolean, volume: number): void {
    this.enabled = enabled; this.volume = Math.min(Math.max(volume, 0), 1);
    if (this.current) this.current.audio.volume = this.volume;
    if (!enabled) this.dispose();
  }
  prime(eventId: string, locale: Locale): void {
    if (!this.enabled) return;
    this.releasePrimed();
    const audio = new Audio(this.resolvePath(eventId, locale)); audio.preload = "auto"; audio.volume = 0; audio.muted = true; audio.loop = true;
    this.primed = { eventId, locale, audio };
    void audio.play().catch(() => { if (this.primed?.audio === audio) this.releasePrimed(); });
  }
  playIfAbsent(eventId: string, locale: Locale): Promise<void> | void {
    // Spine dialogue animations fire the sound/ and Talk events for the same
    // line in the same frame, and some carry only the Talk event. In both cases
    // the line's voice should play exactly once: when the exact line is already
    // the current voice, keep it (no restart); otherwise play it.
    const current = this.current;
    if (current && current.eventId.toLowerCase() === eventId.toLowerCase() && current.locale === locale) {
      return;
    }
    return this.play(eventId, locale);
  }
  async play(eventId: string, locale: Locale): Promise<void> {
    this.stop(); if (!this.enabled) return;
    const primed = this.primed?.eventId.toLowerCase() === eventId.toLowerCase() && this.primed.locale === locale ? this.primed.audio : undefined;
    this.primed = undefined;
    const audio = primed ?? new Audio(this.resolvePath(eventId, locale)); audio.preload = "auto"; audio.loop = false; audio.currentTime = 0; audio.muted = false; audio.volume = this.volume;
    const current = { eventId, locale, audio }; this.current = current;
    audio.addEventListener("ended", () => { if (this.current === current) { this.current = undefined; this.callbacks.onEnded(eventId); } });
    audio.addEventListener("error", () => { if (this.current === current) this.current = undefined; this.callbacks.onError(`语音加载失败：${audio.src}`); });
    if (this.pausedByHost) return;
    try { await audio.play(); } catch (error) {
      if (this.current === current) this.current = undefined;
      this.callbacks.onError(`语音播放失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  setPaused(paused: boolean): void {
    this.pausedByHost = paused; const audio = this.current?.audio; if (!audio) return;
    if (paused) { audio.pause(); return; }
    void audio.play().catch((error: unknown) => this.callbacks.onError(`语音恢复失败：${error instanceof Error ? error.message : String(error)}`));
  }
  stop(): void { if (this.current) { this.current.audio.pause(); this.current.audio.removeAttribute("src"); this.current.audio.load(); this.current = undefined; } }
  dispose(): void { this.stop(); this.releasePrimed(); }
  private releasePrimed(): void { if (this.primed) { this.primed.audio.pause(); this.primed.audio.removeAttribute("src"); this.primed.audio.load(); this.primed = undefined; } }
  getSnapshot() { return { eventId: this.current?.eventId ?? null, locale: this.current?.locale ?? null, playing: Boolean(this.current && !this.current.audio.paused), enabled: this.enabled, volume: this.volume, pausedByHost: this.pausedByHost }; }
}
