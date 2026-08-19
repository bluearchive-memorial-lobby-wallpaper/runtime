import assert from "node:assert/strict";
import test from "node:test";
import { resolveSpineRuntime } from "../src/spine/loadSpineRuntime.ts";

test("maps exported Spine patches to pinned runtime families", () => {
  assert.deepEqual(resolveSpineRuntime("3.8.75"), { family: "3.8", runtimeVersion: "3.8.99", fileName: "spine-webgl-3.8.js" });
  assert.deepEqual(resolveSpineRuntime("4.2.33"), { family: "4.2", runtimeVersion: "4.2.119", fileName: "spine-webgl-4.2.js" });
});

test("rejects unsupported Spine runtime families", () => {
  assert.throws(() => resolveSpineRuntime("4.1.56"), /Unsupported Spine runtime family: 4.1/);
});
