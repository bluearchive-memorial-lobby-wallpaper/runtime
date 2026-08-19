export const SPINE_RUNTIME_MATRIX = {
  "3.8": "3.8.99",
  "4.2": "4.2.119",
} as const;

export function resolveSpineRuntime(version: string) {
  const match = /^(\d+\.\d+)/.exec(version);
  if (!match) throw new Error(`Unsupported Spine runtime version: ${version}`);
  const family = match[1] as keyof typeof SPINE_RUNTIME_MATRIX;
  const runtimeVersion = SPINE_RUNTIME_MATRIX[family];
  if (!runtimeVersion) throw new Error(`Unsupported Spine runtime family: ${family}`);
  return { family, runtimeVersion, fileName: `spine-webgl-${family}.js` };
}

export async function loadSpineRuntime(version: string, basePath = "./vendor"): Promise<void> {
  const runtime = resolveSpineRuntime(version);
  const scriptPath = `${basePath}/${runtime.fileName}`;
  const current = (globalThis as { spine?: any }).spine;
  if (current) {
    normalizeSpineApi(current, runtime.family);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-spine-runtime="${runtime.runtimeVersion}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${scriptPath}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = scriptPath;
    script.async = false;
    script.dataset.spineRuntime = runtime.runtimeVersion;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${scriptPath}`)), { once: true });
    document.head.appendChild(script);
  });
  const loaded = (globalThis as { spine?: any }).spine;
  normalizeSpineApi(loaded, runtime.family);
  if (!loaded?.webgl) throw new Error(`Spine runtime ${runtime.runtimeVersion} did not expose WebGL API`);
}

function normalizeSpineApi(spine: any, family: string) {
  if (!spine) return;
  if (family === "4.2" && !spine.webgl) spine.webgl = spine;
}
