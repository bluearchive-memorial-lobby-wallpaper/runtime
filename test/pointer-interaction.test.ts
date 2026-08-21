import assert from "node:assert/strict";
import test from "node:test";
import { PointerInteractionController, type PointerIntent } from "../dist/index.js";

// The controller listens for input-loss signals (lostpointercapture on the
// canvas, blur/visibilitychange on window/document), which do not exist in the
// node test runner. Install minimal EventTarget stubs before any controller is
// constructed.
class FakeDocument extends EventTarget {
  hidden = false;
}
Object.defineProperty(globalThis, "window", {
  value: new EventTarget(),
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, "document", {
  value: new FakeDocument(),
  writable: true,
  configurable: true,
});

class FakeCanvas extends EventTarget {
  dataset: Record<string, string> = {};
  captured = new Set<number>();
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) {
    this.captured.delete(id);
    // Mirrors the browser: releasing (or losing) capture dispatches
    // lostpointercapture synchronously.
    this.dispatchEvent(new Event("lostpointercapture"));
  }
}

function pointer(type: string, x: number, y: number, id = 1) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, {
    button: { value: 0 }, clientX: { value: x }, clientY: { value: y }, pointerId: { value: id },
  });
  return event;
}

function install(completed: Array<{ intent: PointerIntent }> = []) {
  const canvas = new FakeCanvas();
  const cancelled = { count: 0 };
  const renderer = {
    hitTest: () => "body" as const,
    beginPat: () => false,
    updatePat() {}, endPat() {},
    beginLook: () => true,
    updateLook() {}, endLook() {},
    cancelInteraction() { cancelled.count += 1; },
  };
  const controller = new PointerInteractionController(
    canvas as unknown as HTMLCanvasElement,
    renderer,
    { dragThresholdPixels: 20 },
    { onDialogueRequested: () => true, onInteractionCompleted: (value) => { completed.push(value); } },
  );
  controller.applySettings({
    interactionsEnabled: true,
    mouseTracking: true,
    headPatting: true,
    voiceEnabled: true,
    introAnimation: true,
  });
  return { canvas, controller, cancelled };
}

test("promotes pointer movement to a look interaction at the injected threshold", () => {
  const canvas = new FakeCanvas();
  const calls: string[] = [];
  const completed: Array<{ intent: PointerIntent }> = [];
  const renderer = {
    hitTest: () => "body" as const,
    beginLook: () => { calls.push("beginLook"); return true; },
    updateLook: () => { calls.push("updateLook"); },
    endLook: () => { calls.push("endLook"); },
    beginPat: () => false,
    updatePat() {}, endPat() {}, cancelInteraction() {},
  };
  const controller = new PointerInteractionController(
    canvas as unknown as HTMLCanvasElement,
    renderer,
    { dragThresholdPixels: 20 },
    { onDialogueRequested: () => true, onInteractionCompleted: (value) => { completed.push(value); } },
  );
  controller.applySettings({
    interactionsEnabled: true,
    mouseTracking: true,
    headPatting: true,
    voiceEnabled: true,
    introAnimation: true,
  });
  canvas.dispatchEvent(pointer("pointerdown", 100, 100));
  canvas.dispatchEvent(pointer("pointermove", 115, 100));
  assert.deepEqual(calls, []);
  canvas.dispatchEvent(pointer("pointermove", 121, 100));
  canvas.dispatchEvent(pointer("pointerup", 121, 100));
  assert.deepEqual(calls, ["beginLook", "updateLook", "endLook"]);
  assert.equal(completed[0]?.intent, "look");
  assert.equal(canvas.captured.size, 0);
  controller.dispose();
});

test("lostpointercapture releases a leaked interaction and its capture", () => {
  const completed: Array<{ intent: PointerIntent }> = [];
  const { canvas, controller, cancelled } = install(completed);
  canvas.dispatchEvent(pointer("pointerdown", 100, 100));
  assert.equal(canvas.captured.size, 1);
  canvas.dispatchEvent(new Event("lostpointercapture"));
  assert.equal(canvas.captured.size, 0);
  assert.equal(cancelled.count, 1);
  assert.equal(controller.getSnapshot(), null);
  // With the leak cleared, a stale pointerup must not complete an interaction.
  canvas.dispatchEvent(pointer("pointerup", 100, 100));
  assert.equal(completed.length, 0);
  controller.dispose();
});

test("window blur releases a leaked interaction", () => {
  const completed: Array<{ intent: PointerIntent }> = [];
  const { canvas, controller, cancelled } = install(completed);
  canvas.dispatchEvent(pointer("pointerdown", 100, 100));
  assert.equal(canvas.captured.size, 1);
  (globalThis.window as unknown as EventTarget).dispatchEvent(new Event("blur"));
  assert.equal(canvas.captured.size, 0);
  assert.equal(cancelled.count, 1);
  controller.dispose();
});

test("document visibilitychange (hidden) releases a leaked interaction", () => {
  const completed: Array<{ intent: PointerIntent }> = [];
  const { canvas, controller, cancelled } = install(completed);
  canvas.dispatchEvent(pointer("pointerdown", 100, 100));
  const documentStub = globalThis.document as unknown as FakeDocument;
  documentStub.hidden = true;
  documentStub.dispatchEvent(new Event("visibilitychange"));
  assert.equal(canvas.captured.size, 0);
  assert.equal(cancelled.count, 1);
  documentStub.hidden = false;
  controller.dispose();
});

test("a normal pointerup does not recurse through the synthetic lostpointercapture", () => {
  const completed: Array<{ intent: PointerIntent }> = [];
  const { canvas, controller, cancelled } = install(completed);
  canvas.dispatchEvent(pointer("pointerdown", 100, 100));
  canvas.dispatchEvent(pointer("pointerup", 100, 100));
  assert.equal(completed.length, 1);
  assert.equal(cancelled.count, 0);
  assert.equal(canvas.captured.size, 0);
  controller.dispose();
});

test("a throwing endLook still releases the active pointer so the next gesture can start", () => {
  // Mirrors the real regression: a student skeleton without LookEnd_01_A made
  // the renderer's endLook throw mid-gesture, which used to strand the active
  // pointer and leave the wallpaper unresponsive. The controller must release
  // the pointer and report the declined interaction no matter what the renderer
  // throws.
  const canvas = new FakeCanvas();
  const completed: Array<{ intent: PointerIntent; accepted: boolean }> = [];
  const renderer = {
    hitTest: () => "body" as const,
    beginPat: () => false,
    updatePat() {},
    endPat() {},
    beginLook: () => true,
    updateLook() {},
    endLook() { throw new Error("Animation not found: LookEnd_01_A"); },
    cancelInteraction() {},
  };
  const controller = new PointerInteractionController(
    canvas as unknown as HTMLCanvasElement,
    renderer,
    { dragThresholdPixels: 20 },
    { onDialogueRequested: () => true, onInteractionCompleted: (value) => completed.push(value) },
  );
  controller.applySettings({
    interactionsEnabled: true,
    mouseTracking: true,
    headPatting: true,
    voiceEnabled: true,
    introAnimation: true,
  });
  canvas.dispatchEvent(pointer("pointerdown", 100, 100));
  canvas.dispatchEvent(pointer("pointermove", 130, 100)); // promotes to look
  canvas.dispatchEvent(pointer("pointerup", 130, 100));
  assert.equal(canvas.captured.size, 0, "capture must be released even when endLook throws");
  assert.equal(controller.getSnapshot(), null, "the gesture must not stay active");
  assert.equal(completed.length, 1);
  assert.equal(completed[0]?.accepted, false, "a throwing endLook reports the interaction as declined");
  // The next gesture must be able to start from scratch.
  canvas.dispatchEvent(pointer("pointerdown", 200, 200));
  assert.equal(canvas.captured.size, 1);
  canvas.dispatchEvent(pointer("pointerup", 200, 200));
  assert.equal(completed.length, 2);
  controller.dispose();
});

test("a throwing beginPat declines the gesture without leaking an active pointer", () => {
  const canvas = new FakeCanvas();
  const renderer = {
    hitTest: () => "head" as const,
    beginPat() { throw new Error("Animation not found: Pat_01_A"); },
    updatePat() {},
    endPat() {},
    beginLook: () => true,
    updateLook() {},
    endLook() {},
    cancelInteraction() {},
  };
  const controller = new PointerInteractionController(
    canvas as unknown as HTMLCanvasElement,
    renderer,
    { dragThresholdPixels: 20 },
    { onDialogueRequested: () => true, onInteractionCompleted: () => {} },
  );
  controller.applySettings({
    interactionsEnabled: true,
    mouseTracking: true,
    headPatting: true,
    voiceEnabled: true,
    introAnimation: true,
  });
  canvas.dispatchEvent(pointer("pointerdown", 100, 100));
  assert.equal(canvas.captured.size, 0, "a declined pat must not capture the pointer");
  assert.equal(controller.getSnapshot(), null, "a declined pat must not leave an active gesture");
  controller.dispose();
});
