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
