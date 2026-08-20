import assert from "node:assert/strict";
import test from "node:test";
import { PANEL_TEXT, isPanelLocale, resolveLocalizedText } from "../dist/index.js";

test("resolveLocalizedText picks the locale entry and falls back to English", () => {
  const titleByLocale = { "zh-cn": "圣园未花", en: "Mika" };
  assert.equal(resolveLocalizedText("zh-cn", titleByLocale), "圣园未花");
  assert.equal(resolveLocalizedText("en", titleByLocale), "Mika");
});

test("resolveLocalizedText falls back to English when the locale is missing", () => {
  assert.equal(resolveLocalizedText("zh-cn", { en: "Mika" }), "Mika");
});

test("resolveLocalizedText returns undefined without a localized map", () => {
  assert.equal(resolveLocalizedText("zh-cn", undefined), undefined);
  assert.equal(resolveLocalizedText("zh-cn", {}), undefined);
});

test("resolveLocalizedText honors the explicit fallback when no entry matches", () => {
  assert.equal(
    resolveLocalizedText("ja", { "zh-cn": "圣园未花" }, "Memory Lobby Wallpaper"),
    "Memory Lobby Wallpaper",
  );
});

test("isPanelLocale accepts only the panel languages", () => {
  assert.equal(isPanelLocale("zh-cn"), true);
  assert.equal(isPanelLocale("en"), true);
  assert.equal(isPanelLocale("ja"), false);
  assert.equal(isPanelLocale("ko"), false);
});

test("PANEL_TEXT exposes the same key set for both panel languages", () => {
  assert.deepEqual(
    Object.keys(PANEL_TEXT["zh-cn"]).sort(),
    Object.keys(PANEL_TEXT.en).sort(),
  );
});
