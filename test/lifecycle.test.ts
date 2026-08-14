import assert from "node:assert/strict";
import test from "node:test";
import { initializeStableResourceVariant } from "../dist/index.js";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

test("initializes the final resource variant in one pass", async () => {
  const calls: string[][] = [];
  const result = await initializeStableResourceVariant({
    getTargetVariant: () => "8k",
    initialize: async (variant) => { calls.push(["initialize", variant]); },
    switchVariant: async (variant) => { calls.push(["switch", variant]); },
  });
  assert.deepEqual(calls, [["initialize", "8k"]]);
  assert.deepEqual(result, { variant: "8k", loadPasses: 1 });
});

test("serializes a resource switch requested during initialization", async () => {
  let target = "2k";
  let activeLoads = 0;
  let maximumConcurrentLoads = 0;
  const gate = deferred();
  const calls: string[][] = [];
  const pending = initializeStableResourceVariant({
    getTargetVariant: () => target,
    initialize: async (variant) => {
      calls.push(["initialize-start", variant]);
      activeLoads += 1;
      maximumConcurrentLoads = Math.max(maximumConcurrentLoads, activeLoads);
      await gate.promise;
      activeLoads -= 1;
      calls.push(["initialize-end", variant]);
    },
    switchVariant: async (variant) => {
      calls.push(["switch", variant]);
      activeLoads += 1;
      maximumConcurrentLoads = Math.max(maximumConcurrentLoads, activeLoads);
      activeLoads -= 1;
    },
  });
  await Promise.resolve();
  target = "8k";
  gate.resolve();
  assert.deepEqual(await pending, { variant: "8k", loadPasses: 2 });
  assert.deepEqual(calls, [["initialize-start", "2k"], ["initialize-end", "2k"], ["switch", "8k"]]);
  assert.equal(maximumConcurrentLoads, 1);
});
