import assert from "node:assert/strict";
import test from "node:test";
import { encodeWavPcm } from "../dist/index.js";

test("encodeWavPcm writes a mono 16-bit WAV with correct header", () => {
  const pcm = new Float32Array([0, 0.5, -0.5, 1, -1]);
  const bytes = encodeWavPcm(pcm, 16000);
  assert.equal(bytes.length, 44 + pcm.length * 2);
  assert.equal(String.fromCharCode(...bytes.subarray(0, 4)), "RIFF");
  assert.equal(String.fromCharCode(...bytes.subarray(8, 12)), "WAVE");
  assert.equal(String.fromCharCode(...bytes.subarray(12, 16)), "fmt ");
  assert.equal(String.fromCharCode(...bytes.subarray(36, 40)), "data");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(view.getUint32(4, true), 36 + pcm.length * 2); // RIFF chunk size
  assert.equal(view.getUint32(16, true), 16); // fmt subchunk size
  assert.equal(view.getUint16(20, true), 1); // audioFormat = PCM
  assert.equal(view.getUint16(22, true), 1); // numChannels = mono
  assert.equal(view.getUint32(24, true), 16000); // sampleRate
  assert.equal(view.getUint32(28, true), 16000 * 2); // byteRate
  assert.equal(view.getUint16(32, true), 2); // blockAlign
  assert.equal(view.getUint16(34, true), 16); // bitsPerSample
  assert.equal(view.getUint32(40, true), pcm.length * 2); // data size

  const samples = new Int16Array(bytes.buffer, bytes.byteOffset + 44, pcm.length);
  assert.equal(samples[0], 0);
  assert.equal(samples[1], Math.round(0.5 * 0x7fff));
  assert.equal(samples[2], Math.round(-0.5 * 0x8000));
  assert.equal(samples[3], 0x7fff);
  assert.equal(samples[4], -0x8000);
});

test("encodeWavPcm clamps out-of-range samples", () => {
  const bytes = encodeWavPcm(new Float32Array([2, -2, 0.1]), 8000);
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset + 44, 3);
  assert.equal(samples[0], 0x7fff);
  assert.equal(samples[1], -0x8000);
  assert.equal(samples[2], Math.round(0.1 * 0x7fff));
});
