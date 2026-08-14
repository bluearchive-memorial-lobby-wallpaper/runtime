import assert from "node:assert/strict";
import test from "node:test";
import { FrameLimiter } from "../dist/index.js";

test("limits rendered frames without losing animation time", () => {
  const sourceFps = 240;
  const seconds = 10;
  for (const fpsLimit of [15, 30, 60, 160, 0]) {
    const limiter = new FrameLimiter();
    let frames = 0;
    let animationTime = 0;
    for (let index = 0; index < sourceFps * seconds; index += 1) {
      const delta = limiter.advance(1 / sourceFps, fpsLimit);
      if (delta === null) continue;
      frames += 1;
      animationTime += delta;
    }
    const expected = fpsLimit > 0 ? fpsLimit * seconds : sourceFps * seconds;
    assert.ok(Math.abs(frames - expected) <= 1);
    assert.ok(Math.abs(animationTime - seconds) < 0.001);
  }
});

test("reset discards accumulated frame time", () => {
  const limiter = new FrameLimiter();
  assert.equal(limiter.advance(1 / 120, 30), null);
  limiter.reset();
  assert.equal(limiter.advance(1 / 120, 30), null);
});
