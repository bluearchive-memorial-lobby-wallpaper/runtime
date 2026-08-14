export interface WallpaperProperty<T = unknown> { readonly value: T }
export type WallpaperPropertyValue = boolean | number | string;
export type WallpaperProperties<T = WallpaperPropertyValue> = Readonly<
  Record<string, WallpaperProperty<T> | undefined>
>;

export interface WallpaperEngineGeneralProperties {
  readonly fps?: number;
}

export interface WallpaperEngineCallbacks {
  applyUserProperties(properties: WallpaperProperties): void;
  applyGeneralProperties?(properties: WallpaperEngineGeneralProperties): void;
  setPaused?(paused: boolean): void;
}

export interface WallpaperEngineHostWindow extends Window {
  wallpaperPropertyListener?: {
    applyUserProperties?: (properties: WallpaperProperties) => void;
    applyGeneralProperties?: (properties: WallpaperEngineGeneralProperties) => void;
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
    applyGeneralProperties: (properties: WallpaperEngineGeneralProperties) =>
      callbacks.applyGeneralProperties?.(properties),
    setPaused: (paused: boolean) => callbacks.setPaused?.(paused),
  };
  host.wallpaperPropertyListener = listener;
  return () => {
    if (host.wallpaperPropertyListener === listener) host.wallpaperPropertyListener = previous;
  };
}
