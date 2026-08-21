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

test("playIfAbsent plays a line exactly once across the sound+Talk double fire", async () => {
  const originalAudio = globalThis.Audio;
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  FakeAudio.instances = [];
  try {
    const voice = new VoicePlayer((eventId, locale) => `./${locale}/${eventId}.ogg`, {
      onEnded() {}, onError: assert.fail,
    });
    // Nothing playing yet -> the Talk fallback starts the line's voice.
    await voice.playIfAbsent("line-1", "ja");
    assert.equal(FakeAudio.instances.length, 1);
    assert.equal(FakeAudio.instances[0]?.src, "./ja/line-1.ogg");
    assert.equal(FakeAudio.instances[0]?.playCalls, 1);
    // Same line still playing (the sound/ event arrives after Talk) -> no restart.
    await voice.playIfAbsent("line-1", "ja");
    assert.equal(FakeAudio.instances.length, 1);
    assert.equal(FakeAudio.instances[0]?.playCalls, 1);
    // A different line restarts.
    await voice.playIfAbsent("line-2", "ja");
    assert.equal(FakeAudio.instances.length, 2);
    assert.equal(FakeAudio.instances[1]?.src, "./ja/line-2.ogg");
    // A stopped line can play again (dialogue replay).
    voice.stop();
    await voice.playIfAbsent("line-1", "ja");
    assert.equal(FakeAudio.instances.length, 3);
    assert.equal(FakeAudio.instances[2]?.src, "./ja/line-1.ogg");
    // A different locale is a different line.
    await voice.playIfAbsent("line-1", "ko");
    assert.equal(FakeAudio.instances.length, 4);
    assert.equal(FakeAudio.instances[3]?.src, "./ko/line-1.ogg");
    voice.dispose();
  } finally {
    globalThis.Audio = originalAudio;
  }
});

test("BGM defers source loading until playback is enabled", async () => {
  const originalAudio = globalThis.Audio;
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  FakeAudio.instances = [];
  try {
    const bgm = new BgmPlayer({ title: "Theme", path: "./theme.flac" }, {
      onStatusChange() {}, onError: assert.fail,
    });
    const audio = FakeAudio.instances[0];
    assert(audio);
    assert.equal(audio.src, "");
    bgm.configure(false, 0.5);
    assert.equal(audio.src, "");
    bgm.configure(true, 0.5);
    await Promise.resolve();
    assert.equal(audio.src, "./theme.flac");
    assert.equal(audio.playCalls, 1);
    assert.equal(audio.volume, 0.5);
    bgm.dispose();
    assert.equal(audio.src, "");
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
