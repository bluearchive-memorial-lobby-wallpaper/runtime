import assert from "node:assert/strict";
import test from "node:test";
import {
  createDialogueLineResolver,
  defineWallpaper,
  validateWallpaperDefinition,
} from "../dist/index.js";

test("accepts a minimal content definition", () => {
  const definition = defineWallpaper({
    schemaVersion: 1,
    id: "example",
    model: {
      binary: "model/example.skel",
      atlases: { "2k": "model/example.atlas" },
      spineVersion: "3.8.99",
      designViewport: { width: 2560, height: 1600, centerX: 0, centerY: 800 },
    },
    animations: { idle: "Idle", tracks: { base: 0, motion: 1, attachment: 2 } },
  });
  assert.deepEqual(validateWallpaperDefinition(definition), []);
});

test("reports duplicate dialogue identities", () => {
  const baseDialogue = {
    index: 1,
    motionAnimation: "Talk",
    durationSeconds: 1,
    lines: [{ id: "line", text: { en: "Hello" } }],
  };
  const definition = defineWallpaper({
    schemaVersion: 1,
    id: "example",
    model: {
      binary: "model/example.skel",
      atlases: { base: "model/example.atlas" },
      spineVersion: "3.8.99",
      designViewport: { width: 1, height: 1, centerX: 0, centerY: 0 },
    },
    animations: { idle: "Idle", tracks: { base: 0, motion: 1, attachment: 2 } },
    dialogues: [baseDialogue, baseDialogue],
  });
  assert.equal(validateWallpaperDefinition(definition).length, 2);
});

test("resolves dialogue lines without case sensitivity", () => {
  const resolve = createDialogueLineResolver([{
    index: 1,
    motionAnimation: "Talk",
    durationSeconds: 1,
    lines: [{ id: "Line_One", text: { en: "Hello" } }],
  }]);
  assert.equal(resolve("line_one")?.text.en, "Hello");
});
