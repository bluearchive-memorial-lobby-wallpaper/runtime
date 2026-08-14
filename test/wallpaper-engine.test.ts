import assert from "node:assert/strict";
import test from "node:test";
import {
  installWallpaperEngineBridge,
  type WallpaperEngineHostWindow,
} from "../dist/wallpaper-engine/index.js";

test("forwards Wallpaper Engine callbacks and restores the previous listener", () => {
  const calls: unknown[] = [];
  const previous = { applyUserProperties: () => calls.push("previous") };
  const host = { wallpaperPropertyListener: previous } as unknown as WallpaperEngineHostWindow;
  const uninstall = installWallpaperEngineBridge(host, {
    applyGeneralProperties: (properties) => calls.push(["general", properties]),
    applyUserProperties: (properties) => calls.push(["user", properties]),
    setPaused: (paused) => calls.push(["paused", paused]),
  });

  host.wallpaperPropertyListener?.applyGeneralProperties?.({ fps: 30 });
  host.wallpaperPropertyListener?.applyUserProperties?.({ muted: { value: true } });
  host.wallpaperPropertyListener?.setPaused?.(true);

  assert.deepEqual(calls, [
    ["general", { fps: 30 }],
    ["user", { muted: { value: true } }],
    ["paused", true],
  ]);

  uninstall();
  assert.equal(host.wallpaperPropertyListener, previous);
});

test("does not overwrite a listener installed after the bridge", () => {
  const host = {} as WallpaperEngineHostWindow;
  const uninstall = installWallpaperEngineBridge(host, {
    applyUserProperties: () => undefined,
  });
  const replacement = { applyUserProperties: () => undefined };
  host.wallpaperPropertyListener = replacement;

  uninstall();
  assert.equal(host.wallpaperPropertyListener, replacement);
});
