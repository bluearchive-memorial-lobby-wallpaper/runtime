import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SETTINGS,
  DEFAULT_SETTINGS_VERSION,
  WallpaperEngineAdapter,
  resolveDebugPanelExpanded,
  resolvePropertyGroupVisibility,
} from "../dist/index.js";

test("settings defaults, presets, host callbacks, and session overrides", async () => {
  globalThis.window = {};
  assert.equal(resolveDebugPanelExpanded(false, false, false, false), false);
  assert.equal(resolveDebugPanelExpanded(false, false, true, false), true);
  assert.equal(resolveDebugPanelExpanded(false, true, true, false), false);
  assert.equal(resolveDebugPanelExpanded(true, true, false, false), false);
  assert.equal(resolveDebugPanelExpanded(false, false, false, true), false);
  assert.equal(resolveDebugPanelExpanded(true, false, false, true), true);
  assert.equal(DEFAULT_SETTINGS_VERSION, 7);
  assert.deepEqual(resolvePropertyGroupVisibility(DEFAULT_SETTINGS), {
    qualityCustom: false,
    positionCustom: false,
    panelPositionCustom: false,
    interactionCustom: false,
    interactionChildren: false,
    dialogueControls: true,
    voiceVolume: true,
    dialogueCustom: false,
    primarySubtitleLanguage: false,
    secondarySubtitles: false,
    secondarySubtitleLanguage: false,
    subtitleCustomPosition: false,
    bgmVolume: true,
  });
  assert.deepEqual(
    resolvePropertyGroupVisibility({
      ...DEFAULT_SETTINGS,
      qualityPreset: "custom",
      positionPreset: "custom",
      panelPositionPreset: "custom",
      interactionPreset: "custom",
      dialogueLanguagePreset: "custom",
    }),
    {
      qualityCustom: true,
      positionCustom: true,
      panelPositionCustom: true,
      interactionCustom: true,
      interactionChildren: true,
      dialogueControls: true,
      voiceVolume: true,
      dialogueCustom: true,
      primarySubtitleLanguage: true,
      secondarySubtitles: true,
      secondarySubtitleLanguage: false,
      subtitleCustomPosition: false,
      bgmVolume: true,
    },
  );
  assert.deepEqual(
    resolvePropertyGroupVisibility({
      ...DEFAULT_SETTINGS,
      interactionPreset: "custom",
      voiceEnabled: false,
    }),
    {
      qualityCustom: false,
      positionCustom: false,
      panelPositionCustom: false,
      interactionCustom: true,
      interactionChildren: true,
      dialogueControls: false,
      voiceVolume: false,
      dialogueCustom: false,
      primarySubtitleLanguage: false,
      secondarySubtitles: false,
      secondarySubtitleLanguage: false,
      subtitleCustomPosition: false,
      bgmVolume: true,
    },
  );
  assert.deepEqual(
    resolvePropertyGroupVisibility({
      ...DEFAULT_SETTINGS,
      muted: true,
    }),
    {
      qualityCustom: false,
      positionCustom: false,
      panelPositionCustom: false,
      interactionCustom: false,
      interactionChildren: false,
      dialogueControls: true,
      voiceVolume: false,
      dialogueCustom: false,
      primarySubtitleLanguage: false,
      secondarySubtitles: false,
      secondarySubtitleLanguage: false,
      subtitleCustomPosition: false,
      bgmVolume: false,
    },
  );
  assert.deepEqual(
    resolvePropertyGroupVisibility({
      ...DEFAULT_SETTINGS,
      interactionPreset: "custom",
      interactionsEnabled: false,
      dialogueLanguagePreset: "custom",
      muted: true,
    }),
    {
      qualityCustom: false,
      positionCustom: false,
      panelPositionCustom: false,
      interactionCustom: true,
      interactionChildren: false,
      dialogueControls: false,
      voiceVolume: false,
      dialogueCustom: false,
      primarySubtitleLanguage: false,
      secondarySubtitles: false,
      secondarySubtitleLanguage: false,
      subtitleCustomPosition: false,
      bgmVolume: false,
    },
  );
  assert.deepEqual(
    resolvePropertyGroupVisibility({
      ...DEFAULT_SETTINGS,
      dialogueLanguagePreset: "custom",
      secondarySubtitlesEnabled: true,
    }),
    {
      qualityCustom: false,
      positionCustom: false,
      panelPositionCustom: false,
      interactionCustom: false,
      interactionChildren: false,
      dialogueControls: true,
      voiceVolume: true,
      dialogueCustom: true,
      primarySubtitleLanguage: true,
      secondarySubtitles: true,
      secondarySubtitleLanguage: true,
      subtitleCustomPosition: false,
      bgmVolume: true,
    },
  );
  assert.equal(
    resolvePropertyGroupVisibility({
      ...DEFAULT_SETTINGS,
      dialogueLanguagePreset: "custom",
      subtitlesEnabled: false,
      subtitlePosition: "custom",
    }).subtitleCustomPosition,
    true,
  );
  assert.deepEqual(
    {
      modelScale: DEFAULT_SETTINGS.modelScale,
      modelX: DEFAULT_SETTINGS.modelX,
      modelY: DEFAULT_SETTINGS.modelY,
      modelRotation: DEFAULT_SETTINGS.modelRotation,
      positionPreset: DEFAULT_SETTINGS.positionPreset,
      panelPositionPreset: DEFAULT_SETTINGS.panelPositionPreset,
      panelScale: DEFAULT_SETTINGS.panelScale,
      panelX: DEFAULT_SETTINGS.panelX,
      panelY: DEFAULT_SETTINGS.panelY,
      interactionPreset: DEFAULT_SETTINGS.interactionPreset,
      dialogueLanguagePreset: DEFAULT_SETTINGS.dialogueLanguagePreset,
      debugPreset: DEFAULT_SETTINGS.debugPreset,
      bgmVolume: DEFAULT_SETTINGS.bgmVolume,
      voiceVolume: DEFAULT_SETTINGS.voiceVolume,
      qualityPreset: DEFAULT_SETTINGS.qualityPreset,
      renderResolution: DEFAULT_SETTINGS.renderResolution,
      modelResolution: DEFAULT_SETTINGS.modelResolution,
      fpsLimit: DEFAULT_SETTINGS.fpsLimit,
      backgroundColor: DEFAULT_SETTINGS.backgroundColor,
    },
    {
      modelScale: 0.8,
      modelX: 0,
      modelY: 0,
      modelRotation: 0,
      positionPreset: "default",
      panelPositionPreset: "default",
      panelScale: 1,
      panelX: 0,
      panelY: 0,
      interactionPreset: "default",
      dialogueLanguagePreset: "ja",
      debugPreset: "off",
      bgmVolume: 0.5,
      voiceVolume: 0.7,
      qualityPreset: "default",
      renderResolution: "1080p",
      modelResolution: "2k",
      fpsLimit: 60,
      backgroundColor: [14 / 255, 78 / 255, 172 / 255],
    },
  );

  const adapter = new WallpaperEngineAdapter();
  const listener = window.wallpaperPropertyListener;
  const initialUserProperties = adapter.waitForInitialUserProperties(100);

  assert.equal(adapter.current.debugPanelEnabled, false);
  assert.equal(adapter.current.fpsLimit, 60);
  assert.equal(adapter.current.muted, false);
  assert.equal(adapter.current.dialogueAutoPlay, false);

  listener.applyUserProperties({ muted: { value: true } });
  assert.equal(await initialUserProperties, true);
  assert.equal(await adapter.waitForInitialUserProperties(0), true);
  assert.equal(adapter.current.muted, true);
  listener.applyUserProperties({ muted: { value: false } });
  listener.applyUserProperties({ dialogueautoplay: { value: true } });
  assert.equal(adapter.current.muted, false);
  assert.equal(adapter.current.dialogueAutoPlay, true);

  listener.applyUserProperties({ positionpreset: { value: "custom" } });
  listener.applyUserProperties({
    modelscale: { value: 0.92 },
    modelx: { value: 140 },
    modely: { value: -80 },
    modelrotation: { value: 135 },
  });
  assert.deepEqual(
    [adapter.current.modelScale, adapter.current.modelX, adapter.current.modelY, adapter.current.modelRotation],
    [0.92, 140, -80, 135],
  );
  listener.applyUserProperties({ positionpreset: { value: "default" } });
  assert.deepEqual(
    [adapter.current.modelScale, adapter.current.modelX, adapter.current.modelY, adapter.current.modelRotation],
    [0.8, 0, 0, 0],
  );
  listener.applyUserProperties({ positionpreset: { value: "custom" } });
  assert.deepEqual(
    [adapter.current.modelScale, adapter.current.modelX, adapter.current.modelY, adapter.current.modelRotation],
    [0.92, 140, -80, 135],
  );

  listener.applyUserProperties({ panelpositionpreset: { value: "custom" } });
  listener.applyUserProperties({
    panelscale: { value: 1.18 },
    panelx: { value: 220 },
    panely: { value: -140 },
  });
  assert.deepEqual(
    [adapter.current.panelScale, adapter.current.panelX, adapter.current.panelY],
    [1.18, 220, -140],
  );
  listener.applyUserProperties({ panelpositionpreset: { value: "default" } });
  assert.deepEqual(
    [adapter.current.panelScale, adapter.current.panelX, adapter.current.panelY],
    [1, 0, 0],
  );
  listener.applyUserProperties({ panelpositionpreset: { value: "custom" } });
  assert.deepEqual(
    [adapter.current.panelScale, adapter.current.panelX, adapter.current.panelY],
    [1.18, 220, -140],
  );

  listener.applyUserProperties({ interactionpreset: { value: "custom" } });
  listener.applyUserProperties({
    introanimation: { value: false },
    interactions: { value: true },
    mousetracking: { value: false },
    headpatting: { value: false },
    voicelines: { value: false },
  });
  assert.equal(adapter.current.introAnimation, false);
  assert.equal(adapter.current.mouseTracking, false);
  assert.equal(adapter.current.headPatting, false);
  assert.equal(adapter.current.voiceEnabled, false);
  listener.applyUserProperties({ interactionpreset: { value: "default" } });
  assert.equal(adapter.current.introAnimation, true);
  assert.equal(adapter.current.interactionsEnabled, true);
  assert.equal(adapter.current.mouseTracking, true);
  assert.equal(adapter.current.headPatting, true);
  assert.equal(adapter.current.voiceEnabled, true);
  listener.applyUserProperties({ interactionpreset: { value: "custom" } });
  assert.equal(adapter.current.introAnimation, false);
  assert.equal(adapter.current.voiceEnabled, false);

  listener.applyUserProperties({ dialoguelanguagepreset: { value: "ja" } });
  assert.equal(adapter.current.voiceLocale, "ja");
  assert.equal(adapter.current.subtitlesEnabled, true);
  assert.equal(adapter.current.primarySubtitleLocale, "ja");
  assert.equal(adapter.current.secondarySubtitlesEnabled, false);
  listener.applyUserProperties({ dialoguelanguagepreset: { value: "ko" } });
  assert.equal(adapter.current.voiceLocale, "ko");
  assert.equal(adapter.current.subtitlesEnabled, true);
  assert.equal(adapter.current.primarySubtitleLocale, "ko");
  assert.equal(adapter.current.secondarySubtitlesEnabled, false);
  listener.applyUserProperties({ dialoguelanguagepreset: { value: "en" } });
  assert.equal(adapter.current.voiceLocale, "ja");
  assert.equal(adapter.current.subtitlesEnabled, true);
  assert.equal(adapter.current.primarySubtitleLocale, "en");
  assert.equal(adapter.current.secondarySubtitlesEnabled, false);
  listener.applyUserProperties({ dialoguelanguagepreset: { value: "custom" } });
  listener.applyUserProperties({
    voicelanguage: { value: "ja" },
    showsubtitles: { value: false },
    subtitlelanguage: { value: "ko" },
    showsecondarysubtitles: { value: true },
    secondarysubtitlelanguage: { value: "en" },
    subtitlealignment: { value: "left" },
    subtitleposition: { value: "custom" },
    subtitlex: { value: 240 },
    subtitley: { value: -160 },
  });
  assert.equal(adapter.current.voiceLocale, "ja");
  assert.equal(adapter.current.subtitlesEnabled, false);
  assert.equal(adapter.current.primarySubtitleLocale, "ko");
  assert.equal(adapter.current.secondarySubtitlesEnabled, true);
  assert.equal(adapter.current.secondarySubtitleLocale, "en");
  assert.equal(adapter.current.subtitleAlignment, "left");
  assert.equal(adapter.current.subtitlePosition, "custom");
  assert.equal(adapter.current.subtitleX, 240);
  assert.equal(adapter.current.subtitleY, -160);
  listener.applyUserProperties({ dialoguelanguagepreset: { value: "zh-cn" } });
  assert.equal(adapter.current.voiceLocale, "zh-cn");
  assert.equal(adapter.current.subtitlesEnabled, true);
  assert.equal(adapter.current.primarySubtitleLocale, "zh-cn");
  assert.equal(adapter.current.secondarySubtitlesEnabled, false);
  assert.equal(adapter.current.subtitleAlignment, "center");
  assert.equal(adapter.current.subtitlePosition, "bottom-center");
  assert.equal(adapter.current.subtitleX, 0);
  assert.equal(adapter.current.subtitleY, 0);
  listener.applyUserProperties({ dialoguelanguagepreset: { value: "custom" } });
  assert.equal(adapter.current.voiceLocale, "ja");
  assert.equal(adapter.current.subtitlesEnabled, false);
  assert.equal(adapter.current.primarySubtitleLocale, "ko");
  assert.equal(adapter.current.secondarySubtitlesEnabled, true);
  assert.equal(adapter.current.secondarySubtitleLocale, "en");
  assert.equal(adapter.current.subtitleAlignment, "left");
  assert.equal(adapter.current.subtitlePosition, "custom");
  assert.equal(adapter.current.subtitleX, 240);
  assert.equal(adapter.current.subtitleY, -160);

  listener.applyUserProperties({ panellanguage: { value: "en" } });
  listener.applyUserProperties({ debugpreset: { value: "panel" } });
  assert.equal(adapter.current.debugPanelEnabled, true);
  assert.equal(adapter.current.drawHitboxes, false);
  assert.equal(adapter.current.panelLocale, "en");
  listener.applyUserProperties({ debugpreset: { value: "all" } });
  assert.equal(adapter.current.debugPanelEnabled, true);
  assert.equal(adapter.current.drawHitboxes, true);
  listener.applyUserProperties({ debugpreset: { value: "off" } });
  assert.equal(adapter.current.debugPanelEnabled, false);
  assert.equal(adapter.current.drawHitboxes, false);
  listener.applyUserProperties({ debugpreset: { value: "custom" } });
  listener.applyUserProperties({
    debugpanelenabled: { value: true },
    drawhitboxes: { value: true },
    panellanguage: { value: "en" },
  });
  assert.equal(adapter.current.debugPanelEnabled, true);
  assert.equal(adapter.current.drawHitboxes, true);
  assert.equal(adapter.current.panelLocale, "en");
  listener.applyUserProperties({ debugpreset: { value: "off" } });
  listener.applyUserProperties({ debugpreset: { value: "custom" } });
  assert.equal(adapter.current.debugPanelEnabled, true);
  assert.equal(adapter.current.drawHitboxes, true);
  assert.equal(adapter.current.panelLocale, "en");

  listener.applyGeneralProperties({ fps: 160 });
  assert.equal(adapter.current.fpsLimit, 60);
  listener.applyUserProperties({ qualitypreset: { value: "2k" } });
  assert.equal(adapter.current.qualityPreset, "2k");
  assert.equal(adapter.current.renderResolution, "1440p");
  assert.equal(adapter.current.modelResolution, "4k");
  assert.equal(adapter.current.fpsLimit, 60);
  listener.applyUserProperties({ qualitypreset: { value: "4k" } });
  assert.equal(adapter.current.renderResolution, "2160p");
  assert.equal(adapter.current.modelResolution, "4k");
  listener.applyUserProperties({ qualitypreset: { value: "maximum" } });
  assert.equal(adapter.current.renderResolution, "2160p");
  assert.equal(adapter.current.modelResolution, "8k");
  assert.equal(adapter.current.fpsLimit, 160);
  listener.applyUserProperties({ qualitypreset: { value: "custom" } });
  assert.equal(adapter.current.renderResolution, "1080p");
  assert.equal(adapter.current.modelResolution, "2k");
  listener.applyUserProperties({
    renderresolution: { value: "1440p" },
    modelresolution: { value: "4k" },
    fpslimit: { value: 120 },
  });
  assert.equal(adapter.current.renderResolution, "1440p");
  assert.equal(adapter.current.modelResolution, "4k");
  assert.equal(adapter.current.fpsLimit, 120);
  listener.applyGeneralProperties({ fps: 60 });
  assert.equal(adapter.current.fpsLimit, 60);
  listener.applyUserProperties({ bgmvolume: { value: 50 } });

  adapter.setUserPropertiesForDebug({ positionpreset: "default" });
  assert.deepEqual(
    [adapter.current.modelScale, adapter.current.modelX, adapter.current.modelY, adapter.current.modelRotation],
    [0.8, 0, 0, 0],
  );
  adapter.setUserPropertiesForDebug({ positionpreset: "custom" });
  assert.deepEqual(
    [adapter.current.modelScale, adapter.current.modelX, adapter.current.modelY, adapter.current.modelRotation],
    [0.92, 140, -80, 135],
  );
  adapter.setUserPropertiesForDebug({
    modelscale: 1.05,
    modelx: -210,
    modelrotation: 420,
  });
  adapter.setUserPropertiesForDebug({ positionpreset: "default" });
  adapter.setUserPropertiesForDebug({ positionpreset: "custom" });
  assert.deepEqual(
    [adapter.current.modelScale, adapter.current.modelX, adapter.current.modelY, adapter.current.modelRotation],
    [1.05, -210, -80, 360],
  );

  adapter.setUserPropertiesForDebug({ panelpositionpreset: "default" });
  assert.deepEqual(
    [adapter.current.panelScale, adapter.current.panelX, adapter.current.panelY],
    [1, 0, 0],
  );
  adapter.setUserPropertiesForDebug({ panelpositionpreset: "custom" });
  assert.deepEqual(
    [adapter.current.panelScale, adapter.current.panelX, adapter.current.panelY],
    [1.18, 220, -140],
  );
  adapter.setUserPropertiesForDebug({ panelscale: 2, panelx: -1200, panely: 360 });
  adapter.setUserPropertiesForDebug({ panelpositionpreset: "default" });
  adapter.setUserPropertiesForDebug({ panelpositionpreset: "custom" });
  assert.deepEqual(
    [adapter.current.panelScale, adapter.current.panelX, adapter.current.panelY],
    [1.4, -1000, 360],
  );

  adapter.setUserPropertiesForDebug({ interactionpreset: "default" });
  assert.equal(adapter.current.introAnimation, true);
  assert.equal(adapter.current.mouseTracking, true);
  assert.equal(adapter.current.voiceEnabled, true);
  adapter.setUserPropertiesForDebug({ interactionpreset: "custom" });
  assert.equal(adapter.current.introAnimation, false);
  assert.equal(adapter.current.mouseTracking, false);
  assert.equal(adapter.current.voiceEnabled, false);
  adapter.setUserPropertiesForDebug({ voicelines: true, headpatting: true });
  adapter.setUserPropertiesForDebug({ interactionpreset: "default" });
  adapter.setUserPropertiesForDebug({ interactionpreset: "custom" });
  assert.equal(adapter.current.voiceEnabled, true);
  assert.equal(adapter.current.headPatting, true);

  adapter.setUserPropertiesForDebug({ dialoguelanguagepreset: "ko" });
  assert.equal(adapter.current.voiceLocale, "ko");
  assert.equal(adapter.current.subtitlesEnabled, true);
  assert.equal(adapter.current.primarySubtitleLocale, "ko");
  assert.equal(adapter.current.secondarySubtitlesEnabled, false);
  adapter.setUserPropertiesForDebug({ dialoguelanguagepreset: "en" });
  assert.equal(adapter.current.voiceLocale, "ja");
  assert.equal(adapter.current.subtitlesEnabled, true);
  assert.equal(adapter.current.primarySubtitleLocale, "en");
  assert.equal(adapter.current.secondarySubtitlesEnabled, false);
  adapter.setUserPropertiesForDebug({ dialoguelanguagepreset: "custom" });
  assert.equal(adapter.current.voiceLocale, "ja");
  assert.equal(adapter.current.subtitlesEnabled, false);
  assert.equal(adapter.current.primarySubtitleLocale, "ko");
  assert.equal(adapter.current.secondarySubtitlesEnabled, true);
  assert.equal(adapter.current.secondarySubtitleLocale, "en");
  assert.equal(adapter.current.subtitleAlignment, "left");
  assert.equal(adapter.current.subtitlePosition, "custom");
  adapter.setUserPropertiesForDebug({
    subtitlealignment: "right",
    subtitleposition: "top-center",
    subtitlex: 1200,
    subtitley: -1200,
  });
  assert.equal(adapter.current.subtitleAlignment, "right");
  assert.equal(adapter.current.subtitlePosition, "top-center");
  assert.equal(adapter.current.subtitleX, 1000);
  assert.equal(adapter.current.subtitleY, -1000);
  adapter.setUserPropertiesForDebug({ dialoguelanguagepreset: "ko" });
  adapter.setUserPropertiesForDebug({ dialoguelanguagepreset: "custom" });
  assert.equal(adapter.current.subtitleAlignment, "right");
  assert.equal(adapter.current.subtitlePosition, "top-center");
  assert.equal(adapter.current.subtitleX, 1000);
  assert.equal(adapter.current.subtitleY, -1000);

  adapter.setUserPropertiesForDebug({ qualitypreset: "maximum" });
  assert.equal(adapter.current.renderResolution, "2160p");
  assert.equal(adapter.current.modelResolution, "8k");
  assert.equal(adapter.current.fpsLimit, 60);
  adapter.setUserPropertiesForDebug({ qualitypreset: "custom" });
  assert.equal(adapter.current.renderResolution, "1440p");
  assert.equal(adapter.current.modelResolution, "4k");
  adapter.setUserPropertiesForDebug({
    renderresolution: "720p",
    modelresolution: "2k",
    fpslimit: 45,
  });
  adapter.setUserPropertiesForDebug({ qualitypreset: "default" });
  adapter.setUserPropertiesForDebug({ qualitypreset: "custom" });
  assert.equal(adapter.current.renderResolution, "720p");
  assert.equal(adapter.current.modelResolution, "2k");
  assert.equal(adapter.current.fpsLimit, 45);

  adapter.clearSessionOverrides();
  assert.deepEqual(
    [adapter.current.modelScale, adapter.current.modelX, adapter.current.modelY, adapter.current.modelRotation],
    [0.92, 140, -80, 135],
  );
  assert.deepEqual(
    [adapter.current.panelScale, adapter.current.panelX, adapter.current.panelY],
    [1.18, 220, -140],
  );
  assert.equal(adapter.current.qualityPreset, "custom");
  assert.equal(adapter.current.renderResolution, "1440p");
  assert.equal(adapter.current.modelResolution, "4k");

  adapter.setFpsLimitForDebug(120);
  adapter.setUserPropertiesForDebug({ bgmvolume: 63 });
  assert.equal(adapter.current.fpsLimit, 60);
  assert.equal(adapter.current.bgmVolume, 0.63);
  assert.equal(adapter.settingsState.host.bgmVolume, 0.5);

  listener.applyUserProperties({ bgmvolume: { value: 40 } });
  assert.equal(adapter.current.bgmVolume, 0.4);
  assert.equal(adapter.current.fpsLimit, 60);
  assert.equal(adapter.settingsState.sessionOverrides.bgmVolume, undefined);
  assert.equal(adapter.settingsState.sessionOverrides.fpsLimit, 60);

  adapter.clearSessionOverrides();
  assert.equal(adapter.current.fpsLimit, 60);
  assert.deepEqual(adapter.settingsState.sessionOverrides, {});

  listener.applyUserProperties({ fpslimit: { value: 30 } });
  assert.equal(adapter.current.fpsLimit, 30);
  const browserFallbackAdapter = new WallpaperEngineAdapter();
  assert.equal(await browserFallbackAdapter.waitForInitialUserProperties(0), false);
  delete globalThis.window;
});
