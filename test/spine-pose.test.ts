import assert from "node:assert/strict";
import test from "node:test";
import { resetAndApplyPlaybackPose } from "../dist/index.js";

test("resets a skeleton before applying configured playback tracks", () => {
  const calls: string[] = [];
  const skeleton = {
    setToSetupPose: () => { calls.push("setup"); },
    updateWorldTransform: () => { calls.push("world"); },
  };
  const state = {
    clearTracks: () => { calls.push("clear"); },
    apply: (target: typeof skeleton) => { assert.equal(target, skeleton); calls.push("apply"); },
  };
  resetAndApplyPlaybackPose(skeleton, state, () => { calls.push("configure"); });
  assert.deepEqual(calls, ["clear", "setup", "configure", "apply", "world"]);
});

test("passes the Spine 4.2 physics mode when required", () => {
  const runtimeGlobal = globalThis as typeof globalThis & { spine?: { Physics: { update: number } } };
  const previous = runtimeGlobal.spine;
  runtimeGlobal.spine = { Physics: { update: 2 } };
  let received: unknown;
  const skeleton = { setToSetupPose() {}, updateWorldTransform(physics?: unknown) { received = physics; } };
  const state = { clearTracks() {}, apply() {} };
  resetAndApplyPlaybackPose(skeleton, state, () => {});
  assert.equal(received, 2);
  runtimeGlobal.spine = previous;
});
