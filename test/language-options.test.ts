import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveAvailableSubtitleLocales,
  resolveAvailableVoiceLocales,
  resolveDefaultDialogueLocale,
  resolveDialoguePresetLocales,
  type DialogueLanguageSource,
} from "../dist/index.js";

// The debug panel's language selects are narrowed to the languages a wallpaper
// actually provides: an incomplete preset (Chinese/Korean without both voice
// and subtitles, English without subtitles) is removed, not greyed out.

test("full multi-language wallpaper keeps every preset", () => {
  const voice = ["zh-cn", "ja", "ko"];
  const subtitles = ["zh-cn", "ja", "ko", "en"];
  assert.deepEqual(
    resolveDialoguePresetLocales(voice, subtitles),
    ["zh-cn", "ja", "ko", "en", "custom"],
  );
  assert.equal(resolveDefaultDialogueLocale(voice, subtitles), "zh-cn");
});

test("Japanese-only wallpaper exposes only ja and custom (ibuki scenario)", () => {
  const voice = ["ja"];
  const subtitles = ["ja"];
  assert.deepEqual(resolveDialoguePresetLocales(voice, subtitles), ["ja", "custom"]);
  assert.equal(resolveDefaultDialogueLocale(voice, subtitles), "ja");
});

test("Chinese subtitles without Chinese voice drops the zh-cn preset", () => {
  const voice = ["ja", "ko"];
  const subtitles = ["zh-cn", "ja", "ko", "en"];
  assert.deepEqual(
    resolveDialoguePresetLocales(voice, subtitles),
    ["ja", "ko", "en", "custom"],
  );
});

test("missing English subtitles drops the en preset", () => {
  const voice = ["zh-cn", "ja", "ko"];
  const subtitles = ["zh-cn", "ja", "ko"];
  assert.deepEqual(
    resolveDialoguePresetLocales(voice, subtitles),
    ["zh-cn", "ja", "ko", "custom"],
  );
});

test("declared locales win over inference", () => {
  const definition: DialogueLanguageSource = {
    audio: { voiceLocales: ["ja"], subtitleLocales: ["ja"] },
    dialogues: [{ lines: [{ text: { "zh-cn": "有内容", ja: "内容" } }] }],
  };
  assert.deepEqual(resolveAvailableVoiceLocales(definition), ["ja"]);
  assert.deepEqual(resolveAvailableSubtitleLocales(definition), ["ja"]);
});

test("missing voice locales falls back to the full set (older builds)", () => {
  const definition: DialogueLanguageSource = { audio: { subtitleLocales: ["ja"] } };
  assert.deepEqual(resolveAvailableVoiceLocales(definition), ["zh-cn", "ja", "ko"]);
});

test("missing subtitle locales are inferred from non-empty dialogue text", () => {
  const definition: DialogueLanguageSource = {
    audio: { voiceLocales: ["ja"] },
    dialogues: [
      { lines: [{ text: { ja: "ここ", "zh-cn": "", en: "" } }] },
      { lines: [{ text: { ja: "先生！", "zh-cn": "", en: "" } }] },
    ],
  };
  assert.deepEqual(resolveAvailableSubtitleLocales(definition), ["ja"]);
});

test("an explicitly empty subtitleLocales list stays empty", () => {
  const definition: DialogueLanguageSource = { audio: { subtitleLocales: [] } };
  assert.deepEqual(resolveAvailableSubtitleLocales(definition), []);
});
