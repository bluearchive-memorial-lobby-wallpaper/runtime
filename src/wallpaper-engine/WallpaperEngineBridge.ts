export interface WallpaperProperty<T = unknown> { readonly value: T }
export type WallpaperProperties = Readonly<Record<string, WallpaperProperty | undefined>>;

export interface WallpaperEngineCallbacks {
  applyUserProperties(properties: WallpaperProperties): void;
  applyGeneralProperties?(properties: WallpaperProperties): void;
  setPaused?(paused: boolean): void;
}

export interface WallpaperEngineHostWindow extends Window {
  wallpaperPropertyListener?: {
    applyUserProperties?: (properties: WallpaperProperties) => void;
    applyGeneralProperties?: (properties: WallpaperProperties) => void;
    setPaused?: (paused: boolean) => void;
  };
}

export function installWallpaperEngineBridge(
  host: WallpaperEngineHostWindow,
  callbacks: WallpaperEngineCallbacks,
): () => void {
  const previous = host.wallpaperPropertyListener;
  const listener = {
    applyUserProperties: (properties: WallpaperProperties) => callbacks.applyUserProperties(properties),
    applyGeneralProperties: (properties: WallpaperProperties) => callbacks.applyGeneralProperties?.(properties),
    setPaused: (paused: boolean) => callbacks.setPaused?.(paused),
  };
  host.wallpaperPropertyListener = listener;
  return () => {
    if (host.wallpaperPropertyListener === listener) host.wallpaperPropertyListener = previous;
  };
}
