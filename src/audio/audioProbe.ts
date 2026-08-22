// Audio probing for acceptance verification.
//
// The wallpaper's BgmPlayer/VoicePlayer are plain `new Audio()` elements with no
// analysis surface, so acceptance can only inspect self-reported state. To verify
// the *actual audio content* is healthy (not silent / clipped / broken), this
// module decodes the real asset file off the play graph with OfflineAudioContext
// and re-encodes the first seconds as a small mono 16-bit WAV data URL that an
// external multimodal model can listen to. Zero intrusion on the live playback
// chain: no MediaElementSource (which would permanently reroute element output).

export interface AudioProbeResult {
  readonly dataUrl: string;
  readonly duration: number;
  readonly sampleRate: number;
  readonly frameCount: number;
}

export interface RenderAudioProbeOptions {
  readonly path: string;
  readonly durationSeconds?: number;
  readonly sampleRate?: number;
}

/** Encode mono Float32 PCM as a 16-bit little-endian WAV file (44-byte header). Pure, testable in Node. */
export function encodeWavPcm(pcm: Float32Array, sampleRate: number): Uint8Array {
  const dataSize = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // audioFormat = PCM
  view.setUint16(22, 1, true); // numChannels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byteRate
  view.setUint16(32, 2, true); // blockAlign
  view.setUint16(34, 16, true); // bitsPerSample
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);
  const samples = new Int16Array(buffer, 44);
  for (let i = 0; i < pcm.length; i++) {
    const clamped = Math.max(-1, Math.min(1, pcm[i] ?? 0));
    // -1 clamps to -32768, +1 to 32767 (asymmetric two's-complement range).
    samples[i] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
  }
  return new Uint8Array(buffer);
}

/**
 * Decode `path` with an OfflineAudioContext and render the first seconds to PCM,
 * returned as a WAV data URL. Defaults target the qwen3-omni-flash requirements
 * (16 kHz mono 16-bit, short capture). `path` must be URL-resolvable (the caller
 * resolves definition asset paths against `location.href` before calling).
 */
export async function renderAudioProbe(
  options: RenderAudioProbeOptions,
): Promise<AudioProbeResult> {
  const sampleRate = options.sampleRate ?? 16000;
  const durationSeconds = Math.max(0.25, Math.min(20, options.durationSeconds ?? 4));

  const response = await fetch(options.path);
  if (!response.ok) {
    throw new Error(`audio probe fetch failed: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  // Decode in a throwaway context; the render context is sized to the real
  // content so short clips (voice lines) do not trail a long silence tail.
  const decodeContext = new OfflineAudioContext(1, 1, sampleRate);
  const decoded = await decodeContext.decodeAudioData(arrayBuffer);
  const renderDuration = Math.max(0.001, Math.min(durationSeconds, decoded.duration));
  const frameCount = Math.max(1, Math.ceil(sampleRate * renderDuration));

  const renderContext = new OfflineAudioContext(1, frameCount, sampleRate);
  const source = renderContext.createBufferSource();
  source.buffer = decoded;
  source.connect(renderContext.destination);
  source.start(0, 0, renderDuration);
  const rendered = await renderContext.startRendering();

  const channel = rendered.getChannelData(0);
  const pcm = new Float32Array(channel.length);
  pcm.set(channel);
  const bytes = encodeWavPcm(pcm, sampleRate);
  return {
    dataUrl: `data:audio/wav;base64,${encodeBase64(bytes)}`,
    duration: renderDuration,
    sampleRate,
    frameCount: pcm.length,
  };
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
