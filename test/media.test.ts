import assert from "node:assert/strict";
import test from "node:test";
import { BgmPlayer, VoicePlayer, resolveSubtitlePresentation } from "../dist/index.js";

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  src = ""; paused = true; currentTime = 0; duration = Number.NaN; volume = 1;
  autoplay = false; loop = false; preload = ""; playCalls = 0; loadCalls = 0;
  constructor(src = "") { super(); this.src = src; FakeAudio.instances.push(this); }
  pause(): void { this.paused = true; }
  async play(): Promise<void> { this.playCalls += 1; this.paused = false; }
  load(): void { this.loadCalls += 1; }
  removeAttribute(name: string): void { if (name === "src") this.src = ""; }
}

test("media players resolve instance-owned asset paths", async () => {
  const originalAudio = globalThis.Audio;
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  FakeAudio.instances = [];
  try {
    const bgm = new BgmPlayer({ title: "Theme", path: "./theme.flac" }, {
      onStatusChange() {}, onError: assert.fail,
    });
    bgm.configure(true, 0.4);
    await Promise.resolve();
    assert.equal(FakeAudio.instances[0]?.src, "./theme.flac");
    assert.equal(bgm.getSnapshot().title, "Theme");

    const voice = new VoicePlayer((eventId, locale) => `./${locale}/${eventId}.ogg`, {
      onEnded() {}, onError: assert.fail,
    });
    await voice.play("line-1", "ja");
    assert.equal(FakeAudio.instances[1]?.src, "./ja/line-1.ogg");
    voice.stop(); bgm.dispose();
  } finally {
    globalThis.Audio = originalAudio;
  }
});

test("subtitle presentation uses the injected content resolver", () => {
  const resolveLine = (eventId: string) => eventId === "line-1"
    ? { text: { en: "Hello", ja: "こんにちは" } } : undefined;
  assert.deepEqual(resolveSubtitlePresentation(resolveLine, "line-1", true, "en", true, "ja"), {
    primaryText: "Hello", secondaryText: "こんにちは",
  });
  assert.equal(resolveSubtitlePresentation(resolveLine, "missing", true, "en", false, "ja"), null);
});
