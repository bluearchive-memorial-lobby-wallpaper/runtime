export interface VoicePlayerCallbacks {
  onEnded: (eventId: string) => void;
  onError: (message: string) => void;
}
export type VoicePathResolver<Locale extends string = string> = (eventId: string, locale: Locale) => string;

export class VoicePlayer<Locale extends string = string> {
  private current?: { eventId: string; audio: HTMLAudioElement };
  private volume = 0.7; private enabled = true; private pausedByHost = false;
  constructor(private readonly resolvePath: VoicePathResolver<Locale>, private readonly callbacks: VoicePlayerCallbacks) {}
  configure(enabled: boolean, volume: number): void {
    this.enabled = enabled; this.volume = Math.min(Math.max(volume, 0), 1);
    if (this.current) this.current.audio.volume = this.volume;
    if (!enabled) this.stop();
  }
  async play(eventId: string, locale: Locale): Promise<void> {
    this.stop(); if (!this.enabled) return;
    const audio = new Audio(this.resolvePath(eventId, locale)); audio.preload = "auto"; audio.volume = this.volume;
    const current = { eventId, audio }; this.current = current;
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
  getSnapshot() { return { eventId: this.current?.eventId ?? null, playing: Boolean(this.current && !this.current.audio.paused), enabled: this.enabled, volume: this.volume, pausedByHost: this.pausedByHost }; }
}
