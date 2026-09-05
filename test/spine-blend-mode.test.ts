import assert from "node:assert/strict";
import test from "node:test";
import { applySpineSlotBlendModeOverrides } from "../dist/index.js";

test("overrides an authored slot blend mode without affecting other slots", () => {
  const skeletonData = {
    slots: [
      { name: "background", blendMode: 0 },
      { name: "top_light", blendMode: 1 },
    ],
  };

  applySpineSlotBlendModeOverrides(
    skeletonData,
    { top_light: "screen" },
    { Normal: 0, Additive: 1, Multiply: 2, Screen: 3 },
  );

  assert.deepEqual(skeletonData.slots, [
    { name: "background", blendMode: 0 },
    { name: "top_light", blendMode: 3 },
  ]);
});

test("rejects a slot override that is not present in the skeleton", () => {
  assert.throws(
    () => applySpineSlotBlendModeOverrides(
      { slots: [] },
      { top_light: "screen" },
      { Normal: 0, Additive: 1, Multiply: 2, Screen: 3 },
    ),
    /top_light/,
  );
});
