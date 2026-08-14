import assert from "node:assert/strict";
import test from "node:test";
import { PointerInteractionController, type PointerIntent } from "../dist/index.js";

class FakeCanvas extends EventTarget {
  dataset: Record<string, string> = {};
  captured = new Set<number>();
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
}

function pointer(type: string, x: number, y: number, id = 1) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, {
    button: { value: 0 }, clientX: { value: x }, clientY: { value: y }, pointerId: { value: id },
  });
  return event;
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
