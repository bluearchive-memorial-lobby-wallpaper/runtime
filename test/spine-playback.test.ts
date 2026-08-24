import assert from "node:assert/strict";
import test from "node:test";
import { isEmptySpineAnimation } from "../dist/index.js";

test("recognizes the Spine 4.x empty animation factory result", () => {
  const emptyAnimation = { name: "<empty>" };
  const animationState = {
    emptyAnimation() {
      return emptyAnimation;
    },
  };

  assert.equal(isEmptySpineAnimation(emptyAnimation, animationState), true);
  assert.equal(isEmptySpineAnimation({ name: "Talk_01_A" }, animationState), false);
});

test("recognizes legacy empty-animation values and reserved sentinel names", () => {
  const emptyAnimation = { name: "<empty>" };
  assert.equal(
    isEmptySpineAnimation(emptyAnimation, { emptyAnimation }),
    true,
  );
  assert.equal(
    isEmptySpineAnimation({ name: "<empty>" }, { emptyAnimation: undefined }),
    true,
  );
  assert.equal(
    isEmptySpineAnimation({ name: "Idle_01" }, { emptyAnimation: undefined }),
    false,
  );
});

