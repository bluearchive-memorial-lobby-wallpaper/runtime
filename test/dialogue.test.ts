import assert from "node:assert/strict";
import test from "node:test";
import {
  canTriggerDialogue,
  DialoguePlaybackSequence,
  didDialogueSettingChange,
  didInteractionSettingsChange,
} from "../dist/index.js";

test("dialogue sequence preserves manual position across automatic playback", () => {
  const sequence = new DialoguePlaybackSequence(5);
  sequence.start(1, false);
  assert.equal(sequence.nextIndex, 2);
  assert.equal(sequence.takeAutomaticContinuation(), null);

  sequence.start(1, true);
  assert.deepEqual([
    sequence.takeAutomaticContinuation(), sequence.takeAutomaticContinuation(),
    sequence.takeAutomaticContinuation(), sequence.takeAutomaticContinuation(),
    sequence.takeAutomaticContinuation(),
  ], [2, 3, 4, 5, null]);
  assert.equal(sequence.nextIndex, 1);

  sequence.start(3, true);
  sequence.cancelAutomaticPlayback();
  assert.equal(sequence.takeAutomaticContinuation(), null);
  assert.equal(sequence.nextIndex, 4);

  sequence.start(2, false);
  sequence.setAutomaticPlaybackAfterCurrent(true);
  assert.deepEqual([
    sequence.takeAutomaticContinuation(), sequence.takeAutomaticContinuation(),
    sequence.takeAutomaticContinuation(), sequence.takeAutomaticContinuation(),
  ], [3, 4, 5, null]);

  sequence.start(4, true);
  sequence.stop();
  assert.equal(sequence.takeAutomaticContinuation(), null);
  assert.equal(sequence.nextIndex, 5);
  sequence.reset();
  assert.equal(sequence.nextIndex, 1);
  assert.throws(() => sequence.start(0, true), RangeError);
  assert.throws(() => new DialoguePlaybackSequence(0), RangeError);
});

test("dialogue and interaction settings expose separate reset boundaries", () => {
  const settings = {
    introAnimation: true,
    interactionsEnabled: true,
    mouseTracking: true,
    headPatting: true,
    voiceEnabled: true,
    dialogueAutoPlay: false,
  };
  assert.equal(canTriggerDialogue(settings), true);
  assert.equal(canTriggerDialogue({ ...settings, voiceEnabled: false }), false);
  assert.equal(didInteractionSettingsChange(settings, { ...settings, dialogueAutoPlay: true }), false);
  assert.equal(didInteractionSettingsChange(settings, { ...settings, introAnimation: false }), true);
  assert.equal(didInteractionSettingsChange(settings, { ...settings, voiceEnabled: false }), true);
  assert.equal(didDialogueSettingChange(settings, { ...settings, mouseTracking: false }), false);
  assert.equal(didDialogueSettingChange(settings, { ...settings, voiceEnabled: false }), true);
});
