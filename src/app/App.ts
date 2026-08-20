import { BgmPlayer, type BgmStatus } from "../audio/BgmPlayer.js";
import { VoicePlayer } from "../audio/VoicePlayer.js";
import { DialoguePlaybackSequence } from "../dialogue/DialoguePlaybackSequence.js";
import { SubtitlePresenter } from "../dialogue/SubtitlePresenter.js";
import { FrameLimiter } from "../render/FrameLimiter.js";
import { initializeStableResourceVariant } from "../lifecycle/initializeStableResourceVariant.js";
import { isQualityPreset } from "../settings/qualityPreset.js";
import { MODEL_RESOLUTIONS, RENDER_RESOLUTIONS } from "../settings/resolution.js";
import { PointerInteractionController } from "../interaction/PointerInteractionController.js";
import {
  canTriggerDialogue,
  didDialogueSettingChange,
  didInteractionSettingsChange,
} from "../interaction/interactionSettings.js";
import { resolveDebugPanelExpanded } from "../debug-ui/visibility.js";
import { DebugPanelPointerController } from "../debug-ui/DebugPanelPointerController.js";
import { LogViewerController } from "../debug-ui/LogViewerController.js";
import {
  WallpaperEngineAdapter,
  type WallpaperSettings,
} from "../settings/WallpaperEngineAdapter.js";
import { resolvePropertyGroupVisibility } from "../settings/propertyGroupVisibility.js";
import {
  SpineRenderer,
  type InteractionMode,
  type SpineEventDetail,
} from "../spine/SpineRenderer.js";
import type { InteractiveWallpaperDefinition } from "../definition.js";
import type { VoiceLocale } from "../settings/propertyGroupPresets.js";
import type { WallpaperLogger } from "../logging/WallpaperLogger.js";
import type { WallpaperProperties } from "../wallpaper-engine/WallpaperEngineBridge.js";
import { PANEL_TEXT, resolveLocalizedText, type PanelText } from "../i18n/panel.js";

export interface WallpaperAppOptions {
  readonly definition: InteractiveWallpaperDefinition<VoiceLocale> & {
    readonly audio: {
      readonly bgm: { readonly title: string; readonly path: string };
      readonly voicePath: (eventId: string, locale: VoiceLocale) => string;
    };
  };
  readonly findDialogueLine: (eventId: string) => any;
  readonly logger: WallpaperLogger;
  readonly panelText?: typeof PANEL_TEXT;
  readonly titleByLocale?: Readonly<Record<string, string>>;
}

declare global {
  interface Window {
    wallpaperPropertyListener?: {
      applyGeneralProperties?: (properties: { fps?: number }) => void;
      applyUserProperties?: (properties: WallpaperProperties) => void;
      setPaused?: (paused: boolean) => void;
    };
    __memoryLobbyWallpaperDebug?: any;
  }
}

type Phase = "booting" | "loading" | "running" | "paused" | "error";

function changedSettings(
  previous: Readonly<WallpaperSettings>,
  current: Readonly<WallpaperSettings>,
) {
  const changed: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(current) as (keyof WallpaperSettings)[]) {
    if (!Object.is(previous[key], current[key])) {
      changed[key] = { from: previous[key], to: current[key] };
    }
  }
  return changed;
}

export class App {
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly interactionOverlay: HTMLCanvasElement;
  private readonly statusPanel: HTMLElement;
  private readonly debugPanelToggle: HTMLButtonElement;
  private readonly phaseLabel: HTMLElement;
  private readonly animationLabel: HTMLElement;
  private readonly interactionLabel: HTMLElement;
  private readonly lastActionLabel: HTMLElement;
  private readonly eventLabel: HTMLElement;
  private readonly bgmLabel: HTMLElement;
  private readonly fpsLabel: HTMLElement;
  private readonly viewportLabel: HTMLElement;
  private readonly renderResolutionLabel: HTMLElement;
  private readonly errorLabel: HTMLElement;
  private readonly titleLabel: HTMLElement;
  private readonly loading: HTMLElement;
  private readonly loadingLabel: HTMLElement;
  private readonly openLogsButton: HTMLButtonElement;
  private readonly logViewer: HTMLElement;
  private readonly replayIntroButton: HTMLButtonElement;
  private readonly skipIdleButton: HTMLButtonElement;
  private readonly dialogueButton: HTMLButtonElement;
  private readonly qualityPresetSelect: HTMLSelectElement;
  private readonly qualityCustomControls: HTMLElement;
  private readonly positionPresetSelect: HTMLSelectElement;
  private readonly positionCustomControls: HTMLElement;
  private readonly panelPositionPresetSelect: HTMLSelectElement;
  private readonly panelPositionCustomControls: HTMLElement;
  private readonly panelScaleSlider: HTMLInputElement;
  private readonly panelScaleOutput: HTMLOutputElement;
  private readonly panelXSlider: HTMLInputElement;
  private readonly panelXOutput: HTMLOutputElement;
  private readonly panelYSlider: HTMLInputElement;
  private readonly panelYOutput: HTMLOutputElement;
  private readonly modelScaleSlider: HTMLInputElement;
  private readonly modelScaleOutput: HTMLOutputElement;
  private readonly modelXSlider: HTMLInputElement;
  private readonly modelXOutput: HTMLOutputElement;
  private readonly modelYSlider: HTMLInputElement;
  private readonly modelYOutput: HTMLOutputElement;
  private readonly modelRotationSlider: HTMLInputElement;
  private readonly modelRotationOutput: HTMLOutputElement;
  private readonly interactionPresetSelect: HTMLSelectElement;
  private readonly interactionCustomControls: HTMLElement;
  private readonly interactionDependentControls: HTMLElement;
  private readonly introAnimationCheckbox: HTMLInputElement;
  private readonly interactionsEnabledCheckbox: HTMLInputElement;
  private readonly mouseTrackingCheckbox: HTMLInputElement;
  private readonly headPattingCheckbox: HTMLInputElement;
  private readonly voiceEnabledCheckbox: HTMLInputElement;
  private readonly mutedCheckbox: HTMLInputElement;
  private readonly voiceVolumeControl: HTMLElement;
  private readonly voiceVolumeSlider: HTMLInputElement;
  private readonly voiceVolumeOutput: HTMLOutputElement;
  private readonly dialoguePlaybackGroup: HTMLElement;
  private readonly dialogueAutoPlayCheckbox: HTMLInputElement;
  private readonly dialogueLanguagePresetSelect: HTMLSelectElement;
  private readonly dialogueCustomControls: HTMLElement;
  private readonly voiceLanguageSelect: HTMLSelectElement;
  private readonly showSubtitlesCheckbox: HTMLInputElement;
  private readonly primarySubtitleLanguageControl: HTMLElement;
  private readonly primarySubtitleLanguageSelect: HTMLSelectElement;
  private readonly showSecondarySubtitlesControl: HTMLElement;
  private readonly showSecondarySubtitlesCheckbox: HTMLInputElement;
  private readonly secondarySubtitleLanguageControl: HTMLElement;
  private readonly secondarySubtitleLanguageSelect: HTMLSelectElement;
  private readonly subtitleAlignmentSelect: HTMLSelectElement;
  private readonly subtitlePositionSelect: HTMLSelectElement;
  private readonly subtitleCustomPositionControls: HTMLElement;
  private readonly subtitleXSlider: HTMLInputElement;
  private readonly subtitleXOutput: HTMLOutputElement;
  private readonly subtitleYSlider: HTMLInputElement;
  private readonly subtitleYOutput: HTMLOutputElement;
  private readonly bgmVolumeControl: HTMLElement;
  private readonly bgmVolumeSlider: HTMLInputElement;
  private readonly bgmVolumeOutput: HTMLOutputElement;
  private readonly fpsSlider: HTMLInputElement;
  private readonly fpsOutput: HTMLOutputElement;
  private readonly renderResolutionSelect: HTMLSelectElement;
  private readonly modelResolutionSelect: HTMLSelectElement;
  private readonly panelLanguageSelect: HTMLSelectElement;
  private readonly hitboxesButton: HTMLButtonElement;
  private readonly restoreHostSettingsButton: HTMLButtonElement;
  private readonly debugPanelPointerController: DebugPanelPointerController;
  private readonly logViewerController: LogViewerController;
  private readonly propertyGroupToggleButtons: readonly HTMLButtonElement[];
  private readonly subgroupToggleButtons: readonly HTMLButtonElement[];
  private readonly adapter = new WallpaperEngineAdapter();
  private readonly subtitle: SubtitlePresenter;
  private readonly voice: VoicePlayer<VoiceLocale>;
  private readonly bgm: BgmPlayer;
  private readonly dialoguePlayback: DialoguePlaybackSequence;
  private renderer?: SpineRenderer;
  private pointerController?: PointerInteractionController;
  private settings: Readonly<WallpaperSettings> = this.adapter.current;
  private phase: Phase = "booting";
  private animation = "—";
  private interactionMode: InteractionMode = "intro";
  private lastAction = "—";
  private lastSpineEvent = "—";
  private frameRequest = 0;
  private lastFrameTime = performance.now() / 1000;
  private readonly frameLimiter = new FrameLimiter();
  private startupComplete = false;
  private hostPaused = false;
  private dialogueContinuationPending = false;
  private rendererUnavailable = false;
  private performanceWindowStartedAt = performance.now();
  private performanceFrameCount = 0;
  private performanceRenderTotal = 0;
  private performanceRenderMaximum = 0;
  private measuredFps = 0;
  private averageRenderMilliseconds = 0;
  private maximumRenderMilliseconds = 0;
  private readonly debugFromQuery = new URLSearchParams(location.search).has("debug");
  private readonly contextLossTestFromQuery = new URLSearchParams(
    location.search,
  ).has("testContextLoss");
  private readonly contextLossTestDelay = Number(
    new URLSearchParams(location.search).get("testContextLossDelay"),
  );
  private readonly fpsTestFromQuery = (() => {
    const value = new URLSearchParams(location.search).get("testFps");
    return value === null ? Number.NaN : Number(value);
  })();
  private readonly qualityPresetTestFromQuery = new URLSearchParams(
    location.search,
  ).get("testQuality");
  private readonly weInterfaceTestFromQuery = new URLSearchParams(
    location.search,
  ).has("testWeInterfaces");
  private debugPanelExpanded = this.debugFromQuery;

  constructor(root: HTMLElement, private readonly options: WallpaperAppOptions) {
    this.dialoguePlayback = new DialoguePlaybackSequence(options.definition.dialogues.length);
    this.root = root;
    this.canvas = this.getElement("wallpaper", HTMLCanvasElement);
    this.interactionOverlay = this.getElement("interaction-overlay", HTMLCanvasElement);
    this.statusPanel = this.getElement("status-panel", HTMLElement);
    this.debugPanelToggle = this.getElement("debug-panel-toggle", HTMLButtonElement);
    this.phaseLabel = this.getElement("status-phase", HTMLElement);
    this.animationLabel = this.getElement("status-animation", HTMLElement);
    this.interactionLabel = this.getElement("status-interaction", HTMLElement);
    this.lastActionLabel = this.getElement("status-last-action", HTMLElement);
    this.eventLabel = this.getElement("status-event", HTMLElement);
    this.bgmLabel = this.getElement("status-bgm", HTMLElement);
    this.fpsLabel = this.getElement("status-fps", HTMLElement);
    this.viewportLabel = this.getElement("status-viewport", HTMLElement);
    this.renderResolutionLabel = this.getElement(
      "status-render-resolution",
      HTMLElement,
    );
    this.errorLabel = this.getElement("status-error", HTMLElement);
    this.titleLabel = this.getElement("status-title", HTMLElement);
    this.loading = this.getElement("loading", HTMLElement);
    this.loadingLabel = this.getElement("loading-label", HTMLElement);
    this.openLogsButton = this.getElement("debug-open-logs", HTMLButtonElement);
    this.replayIntroButton = this.getElement("debug-replay-intro", HTMLButtonElement);
    this.skipIdleButton = this.getElement("debug-skip-idle", HTMLButtonElement);
    this.dialogueButton = this.getElement("debug-dialogue", HTMLButtonElement);
    this.qualityPresetSelect = this.getElement(
      "debug-quality-preset",
      HTMLSelectElement,
    );
    this.qualityCustomControls = this.getElement("debug-quality-custom", HTMLElement);
    this.positionPresetSelect = this.getElement(
      "debug-position-preset",
      HTMLSelectElement,
    );
    this.positionCustomControls = this.getElement(
      "debug-position-custom",
      HTMLElement,
    );
    this.panelPositionPresetSelect = this.getElement(
      "debug-panel-position-preset",
      HTMLSelectElement,
    );
    this.panelPositionCustomControls = this.getElement(
      "debug-panel-position-custom",
      HTMLElement,
    );
    this.panelScaleSlider = this.getElement("debug-panel-scale", HTMLInputElement);
    this.panelScaleOutput = this.getElement(
      "debug-panel-scale-output",
      HTMLOutputElement,
    );
    this.panelXSlider = this.getElement("debug-panel-x", HTMLInputElement);
    this.panelXOutput = this.getElement(
      "debug-panel-x-output",
      HTMLOutputElement,
    );
    this.panelYSlider = this.getElement("debug-panel-y", HTMLInputElement);
    this.panelYOutput = this.getElement(
      "debug-panel-y-output",
      HTMLOutputElement,
    );
    this.modelScaleSlider = this.getElement("debug-model-scale", HTMLInputElement);
    this.modelScaleOutput = this.getElement(
      "debug-model-scale-output",
      HTMLOutputElement,
    );
    this.modelXSlider = this.getElement("debug-model-x", HTMLInputElement);
    this.modelXOutput = this.getElement("debug-model-x-output", HTMLOutputElement);
    this.modelYSlider = this.getElement("debug-model-y", HTMLInputElement);
    this.modelYOutput = this.getElement("debug-model-y-output", HTMLOutputElement);
    this.modelRotationSlider = this.getElement(
      "debug-model-rotation",
      HTMLInputElement,
    );
    this.modelRotationOutput = this.getElement(
      "debug-model-rotation-output",
      HTMLOutputElement,
    );
    this.interactionPresetSelect = this.getElement(
      "debug-interaction-preset",
      HTMLSelectElement,
    );
    this.interactionCustomControls = this.getElement(
      "debug-interaction-custom",
      HTMLElement,
    );
    this.interactionDependentControls = this.getElement(
      "debug-interaction-dependent",
      HTMLElement,
    );
    this.introAnimationCheckbox = this.getElement(
      "debug-intro-animation",
      HTMLInputElement,
    );
    this.interactionsEnabledCheckbox = this.getElement(
      "debug-interactions-enabled",
      HTMLInputElement,
    );
    this.mouseTrackingCheckbox = this.getElement(
      "debug-mouse-tracking",
      HTMLInputElement,
    );
    this.headPattingCheckbox = this.getElement("debug-head-patting", HTMLInputElement);
    this.voiceEnabledCheckbox = this.getElement("debug-voice-enabled", HTMLInputElement);
    this.mutedCheckbox = this.getElement("debug-muted", HTMLInputElement);
    this.voiceVolumeControl = this.getElement(
      "debug-voice-volume-control",
      HTMLElement,
    );
    this.voiceVolumeSlider = this.getElement("debug-voice-volume", HTMLInputElement);
    this.voiceVolumeOutput = this.getElement(
      "debug-voice-volume-output",
      HTMLOutputElement,
    );
    this.dialoguePlaybackGroup = this.getElement(
      "debug-dialogue-playback-group",
      HTMLElement,
    );
    this.dialogueAutoPlayCheckbox = this.getElement(
      "debug-dialogue-autoplay",
      HTMLInputElement,
    );
    this.dialogueLanguagePresetSelect = this.getElement(
      "debug-dialogue-language-preset",
      HTMLSelectElement,
    );
    this.dialogueCustomControls = this.getElement(
      "debug-dialogue-custom",
      HTMLElement,
    );
    this.voiceLanguageSelect = this.getElement(
      "debug-voice-language",
      HTMLSelectElement,
    );
    this.showSubtitlesCheckbox = this.getElement(
      "debug-show-subtitles",
      HTMLInputElement,
    );
    this.primarySubtitleLanguageControl = this.getElement(
      "debug-primary-subtitle-language-control",
      HTMLElement,
    );
    this.primarySubtitleLanguageSelect = this.getElement(
      "debug-primary-subtitle-language",
      HTMLSelectElement,
    );
    this.showSecondarySubtitlesControl = this.getElement(
      "debug-show-secondary-subtitles-control",
      HTMLElement,
    );
    this.showSecondarySubtitlesCheckbox = this.getElement(
      "debug-show-secondary-subtitles",
      HTMLInputElement,
    );
    this.secondarySubtitleLanguageControl = this.getElement(
      "debug-secondary-subtitle-language-control",
      HTMLElement,
    );
    this.secondarySubtitleLanguageSelect = this.getElement(
      "debug-secondary-subtitle-language",
      HTMLSelectElement,
    );
    this.subtitleAlignmentSelect = this.getElement(
      "debug-subtitle-alignment",
      HTMLSelectElement,
    );
    this.subtitlePositionSelect = this.getElement(
      "debug-subtitle-position",
      HTMLSelectElement,
    );
    this.subtitleCustomPositionControls = this.getElement(
      "debug-subtitle-custom-position",
      HTMLElement,
    );
    this.subtitleXSlider = this.getElement("debug-subtitle-x", HTMLInputElement);
    this.subtitleXOutput = this.getElement(
      "debug-subtitle-x-output",
      HTMLOutputElement,
    );
    this.subtitleYSlider = this.getElement("debug-subtitle-y", HTMLInputElement);
    this.subtitleYOutput = this.getElement(
      "debug-subtitle-y-output",
      HTMLOutputElement,
    );
    this.bgmVolumeControl = this.getElement("debug-bgm-volume-control", HTMLElement);
    this.bgmVolumeSlider = this.getElement("debug-bgm-volume", HTMLInputElement);
    this.bgmVolumeOutput = this.getElement(
      "debug-bgm-volume-output",
      HTMLOutputElement,
    );
    this.fpsSlider = this.getElement("debug-fps", HTMLInputElement);
    this.fpsOutput = this.getElement("debug-fps-output", HTMLOutputElement);
    this.renderResolutionSelect = this.getElement(
      "debug-render-resolution",
      HTMLSelectElement,
    );
    this.modelResolutionSelect = this.getElement(
      "debug-model-resolution",
      HTMLSelectElement,
    );
    this.panelLanguageSelect = this.getElement(
      "debug-panel-language",
      HTMLSelectElement,
    );
    this.hitboxesButton = this.getElement("debug-hitboxes", HTMLButtonElement);
    this.restoreHostSettingsButton = this.getElement(
      "debug-restore-host-settings",
      HTMLButtonElement,
    );
    this.propertyGroupToggleButtons = Array.from(
      this.statusPanel.querySelectorAll<HTMLButtonElement>(
        ".status-panel__property-group-toggle",
      ),
    );
    this.subgroupToggleButtons = Array.from(
      this.statusPanel.querySelectorAll<HTMLButtonElement>(
        ".status-panel__subgroup-toggle",
      ),
    );
    this.subtitle = new SubtitlePresenter(
      this.getElement("subtitle", HTMLElement),
      this.getElement("subtitle-primary", HTMLElement),
      this.getElement("subtitle-secondary", HTMLElement),
      this.options.findDialogueLine,
      { primaryLocale: "zh-cn", secondaryLocale: "ja" },
    );
    this.voice = new VoicePlayer(this.options.definition.audio.voicePath, {
      onEnded: (eventId) => {
        this.subtitle.hide(eventId);
        if (this.dialogueContinuationPending) {
          this.dialogueContinuationPending = false;
          this.finishDialogueAndContinueAutomaticPlayback();
        }
      },
      onError: (message) => {
        console.warn(message);
        this.options.logger.warn("error", "voice playback error", { message });
        this.eventLabel.textContent = "audio-error";
      },
    });
    this.bgm = new BgmPlayer(this.options.definition.audio.bgm, {
      onStatusChange: (status) => this.updateBgmLabel(status),
      onError: (message) => {
        console.warn(message);
        this.options.logger.warn("error", "BGM playback error", { message });
        this.eventLabel.textContent = "bgm-error";
      },
    });
    this.logViewer = this.getElement("wallpaper-log-viewer", HTMLElement);
    const logViewport = this.getElement(
      "wallpaper-log-viewer-content",
      HTMLPreElement,
    );
    this.debugPanelPointerController = new DebugPanelPointerController({
      panel: this.statusPanel,
      panelScrollbar: this.getElement("debug-panel-scrollbar", HTMLElement),
      panelScrollbarThumb: this.getElement(
        "debug-panel-scrollbar-thumb",
        HTMLElement,
      ),
      logViewer: this.logViewer,
      logViewport,
      logScrollbar: this.getElement("wallpaper-log-scrollbar", HTMLElement),
      logScrollbarThumb: this.getElement(
        "wallpaper-log-scrollbar-thumb",
        HTMLElement,
      ),
      logHorizontalScrollbar: this.getElement(
        "wallpaper-log-scrollbar-horizontal",
        HTMLElement,
      ),
      logHorizontalScrollbarThumb: this.getElement(
        "wallpaper-log-scrollbar-horizontal-thumb",
        HTMLElement,
      ),
    });
    this.logViewerController = new LogViewerController({
      viewer: this.logViewer,
      title: this.getElement("wallpaper-log-viewer-title", HTMLElement),
      closeButton: this.getElement(
        "wallpaper-log-viewer-close",
        HTMLButtonElement,
      ),
      copyButton: this.getElement(
        "wallpaper-log-viewer-copy",
        HTMLButtonElement,
      ),
      sessionLabel: this.getElement(
        "wallpaper-log-viewer-session-label",
        HTMLElement,
      ),
      previousSessionButton: this.getElement(
        "wallpaper-log-viewer-previous-session",
        HTMLButtonElement,
      ),
      nextSessionButton: this.getElement(
        "wallpaper-log-viewer-next-session",
        HTMLButtonElement,
      ),
      notice: this.getElement(
        "wallpaper-log-viewer-notice",
        HTMLParagraphElement,
      ),
      content: logViewport,
      getSnapshot: () => this.options.logger.getSessionSnapshot(),
      onLayoutChange: () => this.debugPanelPointerController.requestRefresh(),
      onInteraction: (action, details) =>
        this.options.logger.info("interaction", `log viewer ${action}`, details),
      onVisibilityChange: () => this.syncLogToggleButton(),
    });
  }

  async start() {
    const startupStartedAt = performance.now();
    this.options.logger.info("lifecycle", "application startup started");
    this.setPhase("loading");
    this.adapter.subscribePaused((paused) => this.setHostPaused(paused));
    if (this.weInterfaceTestFromQuery) {
      window.wallpaperPropertyListener?.applyGeneralProperties?.({ fps: 30 });
      window.wallpaperPropertyListener?.applyUserProperties?.({
        qualitypreset: { value: "2k" },
        panellanguage: { value: "en" },
        bgmvolume: { value: 25 },
        panelpositionpreset: { value: "custom" },
        panelscale: { value: 0.9 },
        debugpreset: { value: "panel" },
      });
    }
    if (Number.isFinite(this.fpsTestFromQuery)) {
      window.wallpaperPropertyListener?.applyGeneralProperties?.({
        fps: this.fpsTestFromQuery,
      });
    }
    if (
      this.qualityPresetTestFromQuery !== "custom" &&
      isQualityPreset(this.qualityPresetTestFromQuery)
    ) {
      window.wallpaperPropertyListener?.applyUserProperties?.({
        qualitypreset: { value: this.qualityPresetTestFromQuery },
      });
    }

    try {
      const initialSettingsWaitStartedAt = performance.now();
      const receivedInitialUserProperties =
        await this.adapter.waitForInitialUserProperties();
      this.root.dataset.initialSettingsSource = receivedInitialUserProperties
        ? "wallpaper-engine"
        : "fallback";
      this.root.dataset.initialSettingsWaitMs = String(
        Number((performance.now() - initialSettingsWaitStartedAt).toFixed(1)),
      );
      this.settings = this.adapter.current;
      this.options.logger.info("configuration", "initial settings resolved", {
        source: this.root.dataset.initialSettingsSource,
        settings: this.settings,
      });
      this.renderer = new SpineRenderer(this.canvas, this.options.definition, {
        onAnimationChange: (animation) => {
          const previousAnimation = this.animation;
          this.animation = animation;
          this.animationLabel.textContent = animation;
          this.options.logger.info("animation", "animation changed", {
            from: previousAnimation,
            to: animation,
          });
        },
        onInteractionModeChange: (mode) => {
          const previousMode = this.interactionMode;
          if (mode === "cooldown" && this.interactionMode !== "cooldown") {
            const completedMode = this.interactionMode;
            this.lastAction = completedMode;
            this.lastActionLabel.textContent = this.panelText.interactions[completedMode];
          }
          this.interactionMode = mode;
          this.interactionLabel.textContent = this.panelText.interactions[mode];
          if (previousMode !== mode) {
            this.options.logger.info("animation", "interaction mode changed", {
              from: previousMode,
              to: mode,
            });
          }
          if (mode === "idle") {
            this.subtitle.hide();
            this.finishDialogueAndContinueAutomaticPlayback();
          }
        },
        onSpineEvent: (event) => this.handleSpineEvent(event),
        onContextLost: () => this.handleRendererContextLost(),
        onContextRestored: () => this.handleRendererContextRestored(),
        onError: (error) => this.fail(error),
      });
      const modelInitializationStartedAt = performance.now();
      const initialModel = await initializeStableResourceVariant({
        getTargetVariant: () => this.adapter.current.modelResolution,
        initialize: (resolution) => this.renderer!.initialize(resolution),
        switchVariant: (resolution) =>
          this.renderer!.setModelResolution(resolution),
      });
      this.root.dataset.initialModelResolution = initialModel.variant;
      this.root.dataset.initialModelLoadPasses = String(initialModel.loadPasses);
      this.root.dataset.initialModelLoadMs = String(
        Number((performance.now() - modelInitializationStartedAt).toFixed(1)),
      );
      this.settings = this.adapter.current;
      this.adapter.subscribe((settings) => this.applySettings(settings));
      this.pointerController = new PointerInteractionController(
        this.canvas,
        this.renderer,
        this.options.definition.interactions,
        {
          onDialogueRequested: () => this.playNextDialogue(undefined, true),
          onInteractionCompleted: (interaction) =>
            this.options.logger.info("interaction", "wallpaper pointer interaction", interaction),
        },
      );
      this.pointerController.applySettings(this.settings);
      this.renderer.playInitialSequence(this.settings.introAnimation);
      this.installLifecycleHandlers();
      this.installDebugApi();
      this.startupComplete = true;
      this.setPhase(this.isPaused() ? "paused" : "running");
      if (this.weInterfaceTestFromQuery) {
        const listener = window.wallpaperPropertyListener;
        const generalPropertiesPassed = this.settings.fpsLimit === 30;
        const userPropertiesPassed =
          this.settings.qualityPreset === "2k" &&
          this.settings.panelLocale === "en" &&
          this.settings.bgmVolume === 0.25 &&
          this.settings.panelScale === 0.9 &&
          this.settings.debugPanelEnabled;
        listener?.setPaused?.(true);
        const pausePassed = this.phase === "paused";
        listener?.setPaused?.(false);
        const resumePassed = this.phase === "running";
        this.root.dataset.weInterfaceGeneral = generalPropertiesPassed
          ? "passed"
          : "failed";
        this.root.dataset.weInterfaceUser = userPropertiesPassed
          ? "passed"
          : "failed";
        this.root.dataset.weInterfacePause =
          pausePassed && resumePassed ? "passed" : "failed";
        this.root.dataset.weInterfaceTest =
          generalPropertiesPassed &&
          userPropertiesPassed &&
          pausePassed &&
          resumePassed
            ? "passed"
            : "failed";
        this.options.logger.info("lifecycle", "WE interface browser test completed", {
          generalPropertiesPassed,
          userPropertiesPassed,
          pausePassed,
          resumePassed,
        });
      }
      this.root.dataset.startupReadyMs = String(
        Number((performance.now() - startupStartedAt).toFixed(1)),
      );
      this.options.logger.info("lifecycle", "application startup completed", {
        startupMilliseconds: Number((performance.now() - startupStartedAt).toFixed(1)),
        modelResolution: initialModel.variant,
        modelLoadPasses: initialModel.loadPasses,
      });
      this.lastFrameTime = performance.now() / 1000;
      this.frameLimiter.reset();
      this.resetPerformanceWindow();
      this.frameRequest = requestAnimationFrame((time) => this.frame(time));
      if (this.contextLossTestFromQuery) {
        window.setTimeout(
          () => this.renderer?.simulateContextLossForDebug(),
          Number.isFinite(this.contextLossTestDelay) &&
            this.contextLossTestDelay >= 0
            ? this.contextLossTestDelay
            : 750,
        );
      }
    } catch (error) {
      this.fail(error);
    }
  }

  private applySettings(settings: Readonly<WallpaperSettings>) {
    const previousSettings = this.settings;
    const changes = changedSettings(previousSettings, settings);
    if (Object.keys(changes).length > 0) {
      this.options.logger.info("configuration", "effective settings changed", changes);
    }
    const interactionSettingsChanged = didInteractionSettingsChange(
      previousSettings,
      settings,
    );
    this.debugPanelExpanded = resolveDebugPanelExpanded(
      this.debugPanelExpanded,
      previousSettings.debugPanelEnabled,
      settings.debugPanelEnabled,
      this.debugFromQuery,
    );
    this.settings = settings;
    this.syncDebugPanelLayout(settings);
    this.syncPanelText();
    this.renderer?.applySettings(settings);
    if (
      this.renderer &&
      previousSettings.modelResolution !== settings.modelResolution
    ) {
      void this.renderer
        .setModelResolution(settings.modelResolution)
        .catch((error) => this.fail(error));
    }
    this.pointerController?.applySettings(settings);
    if (interactionSettingsChanged) {
      this.returnToIdle(didDialogueSettingChange(previousSettings, settings));
    }
    this.dialoguePlayback.setAutomaticPlaybackAfterCurrent(
      settings.dialogueAutoPlay && canTriggerDialogue(settings),
    );
    this.voice.configure(settings.voiceEnabled && !settings.muted, settings.voiceVolume);
    this.bgm.configure(!settings.muted, settings.bgmVolume);
    this.updateBgmLabel(this.bgm.getSnapshot().status);
    this.subtitle.configure(
      settings.subtitlesEnabled,
      settings.primarySubtitleLocale,
      settings.secondarySubtitlesEnabled,
      settings.secondarySubtitleLocale,
      settings.subtitleAlignment,
      settings.subtitlePosition,
      settings.subtitleX,
      settings.subtitleY,
    );
    this.syncDebugControls(settings);
    this.updateViewportLabel();
    this.syncDebugPanelVisibility();
    this.interactionOverlay.hidden = !settings.drawHitboxes;
    if (!settings.drawHitboxes) this.clearInteractionOverlay();
  }

  private frame(timestampMilliseconds: number) {
    this.frameRequest = requestAnimationFrame((time) => this.frame(time));
    if (!this.renderer || this.isPaused() || this.phase === "error") return;

    const now = timestampMilliseconds / 1000;
    const elapsed = Math.min(Math.max(now - this.lastFrameTime, 0), 0.25);
    this.lastFrameTime = now;
    const delta = this.frameLimiter.advance(elapsed, this.settings.fpsLimit);
    if (delta === null) return;
    const renderStartedAt = performance.now();
    if (!this.renderer.updateAndRender(delta)) return;
    this.recordRenderPerformance(
      timestampMilliseconds,
      performance.now() - renderStartedAt,
    );
    this.updateViewportLabel();
    if (this.settings.drawHitboxes) this.drawInteractionOverlay();
  }

  private playNextDialogue(index?: number, allowAutomaticPlayback = false): boolean {
    if (!this.renderer || !canTriggerDialogue(this.settings)) return false;
    const automatic =
      allowAutomaticPlayback &&
      this.settings.dialogueAutoPlay;
    const targetIndex = index ?? this.dialoguePlayback.nextIndex;
    this.voice.stop();
    this.subtitle.hide();
    if (!this.renderer.playDialogue(targetIndex)) return false;
    this.dialoguePlayback.start(targetIndex, automatic);
    return true;
  }

  private finishDialogueAndContinueAutomaticPlayback() {
    if (!this.renderer) return;
    const index = this.dialoguePlayback.takeAutomaticContinuation();
    if (index === null) return;
    this.voice.stop();
    this.subtitle.hide();
    if (!this.renderer.playDialogue(index)) {
      this.dialoguePlayback.stop();
    }
  }

  private skipToIdle() {
    this.dialoguePlayback.stop();
    this.voice.stop();
    this.subtitle.hide();
    this.renderer?.playIdle();
  }

  private returnToIdle(resetDialogueQueue = false) {
    if (resetDialogueQueue) this.dialoguePlayback.reset();
    else this.dialoguePlayback.stop();
    this.voice.stop();
    this.subtitle.hide();
    this.renderer?.playIdle();
  }

  private handleSpineEvent(event: SpineEventDetail) {
    if (event.trackIndex !== 1) return;
    this.lastSpineEvent = event.stringValue || event.name;
    this.eventLabel.textContent = this.lastSpineEvent;
    if (event.name.startsWith("sound/")) {
      const eventId = event.name.slice("sound/".length);
      void this.voice.play(eventId, this.settings.voiceLocale);
    } else if (event.name === "Talk" && event.stringValue) {
      this.subtitle.show(event.stringValue);
    }
  }

  private installLifecycleHandlers() {
    const resizeObserver = new ResizeObserver(() => {
      this.renderer?.resize();
      this.updateViewportLabel();
      if (this.settings.drawHitboxes) this.drawInteractionOverlay();
    });
    resizeObserver.observe(this.canvas);

    document.addEventListener("visibilitychange", this.syncPausedState);
    window.addEventListener("beforeunload", () => {
      this.options.logger.info("lifecycle", "wallpaper load ended");
      cancelAnimationFrame(this.frameRequest);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", this.syncPausedState);
      this.pointerController?.dispose();
      this.logViewerController.dispose();
      this.debugPanelPointerController.dispose();
      this.adapter.dispose();
      this.removeBgmUnlockListeners();
      this.voice.stop();
      this.bgm.dispose();
      this.renderer?.dispose();
    });
    window.addEventListener("pointerdown", this.unlockBgmFromGesture, true);
    window.addEventListener("keydown", this.unlockBgmFromGesture, true);
  }

  private installDebugApi() {
    window.__memoryLobbyWallpaperDebug = {
      getSnapshot: () => ({
        phase: this.phase,
        animation: this.animation,
        interactionMode: this.interactionMode,
        lastAction: this.lastAction,
        lastSpineEvent: this.lastSpineEvent,
        nextDialogueIndex: this.dialoguePlayback.nextIndex,
        dialogueAutoPlayActive: this.dialoguePlayback.automaticPlaybackActive,
        fpsLimit: this.settings.fpsLimit,
        settings: { ...this.settings },
        settingsState: this.adapter.settingsState,
        renderer: this.renderer?.getSnapshot() ?? null,
        pointer: this.pointerController?.getSnapshot() ?? null,
        voice: this.voice.getSnapshot(),
        bgm: this.bgm.getSnapshot(),
        subtitle: this.subtitle.getSnapshot(),
        performance: {
          actualFps: this.measuredFps,
          averageRenderMilliseconds: this.averageRenderMilliseconds,
          maximumRenderMilliseconds: this.maximumRenderMilliseconds,
        },
      }),
      replayIntro: () => this.replaySession(),
      skipToIdle: () => this.skipToIdle(),
      playDialogue: (index: number) => this.playNextDialogue(index),
      setFpsLimit: (fps: number) => this.adapter.setFpsLimitForDebug(fps),
      retryBgm: () => this.bgm.retryFromUserGesture(),
      setUserProperties: (properties: Record<string, boolean | number | string>) =>
        this.adapter.setUserPropertiesForDebug(properties),
      clearSessionOverrides: () => this.adapter.clearSessionOverrides(),
    };

    this.statusPanel.addEventListener("click", (event) => {
      const target = event.target;
      const button = target instanceof Element ? target.closest<HTMLButtonElement>("button") : null;
      if (!button) return;
      this.options.logger.info("interaction", "debug panel button clicked", {
        id: button.id || undefined,
        action: button.dataset.panelText,
      });
    });

    this.debugPanelToggle.addEventListener("click", () => {
      if (this.debugPanelToggle.disabled) return;
      this.options.logger.info("interaction", "debug panel visibility toggled", {
        expanded: !this.debugPanelExpanded,
      });
      this.debugPanelExpanded = !this.debugPanelExpanded;
      this.syncDebugPanelVisibility();
    });
    this.openLogsButton.addEventListener("click", () => {
      try {
        const opening = !this.logViewerController.isOpen;
        this.options.logger.info(
          "interaction",
          opening ? "debug panel open logs clicked" : "debug panel close logs clicked",
        );
        this.logViewerController.toggle(this.settings.panelLocale);
      } catch (error) {
        this.options.logger.error("error", "opening logs failed", error);
        this.eventLabel.textContent = "log-open-error";
      }
    });
    for (const button of this.propertyGroupToggleButtons) {
      button.addEventListener("click", () => this.togglePropertyGroup(button));
    }
    for (const button of this.subgroupToggleButtons) {
      button.addEventListener("click", () => this.toggleSubgroup(button));
    }
    this.replayIntroButton.addEventListener("click", () => this.replaySession());
    this.skipIdleButton.addEventListener("click", () => this.skipToIdle());
    this.dialogueButton.addEventListener("click", () => this.playNextDialogue());
    this.qualityPresetSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        qualitypreset: this.qualityPresetSelect.value,
      }),
    );
    this.positionPresetSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        positionpreset: this.positionPresetSelect.value,
      }),
    );
    this.panelPositionPresetSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        panelpositionpreset: this.panelPositionPresetSelect.value,
      }),
    );
    this.panelScaleSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({
        panelscale: Number(this.panelScaleSlider.value),
      }),
    );
    this.panelXSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({
        panelx: Number(this.panelXSlider.value),
      }),
    );
    this.panelYSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({
        panely: Number(this.panelYSlider.value),
      }),
    );
    this.modelScaleSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({
        modelscale: Number(this.modelScaleSlider.value),
      }),
    );
    this.modelXSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({ modelx: Number(this.modelXSlider.value) }),
    );
    this.modelYSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({ modely: Number(this.modelYSlider.value) }),
    );
    this.modelRotationSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({
        modelrotation: Number(this.modelRotationSlider.value),
      }),
    );
    this.interactionPresetSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        interactionpreset: this.interactionPresetSelect.value,
      }),
    );
    this.introAnimationCheckbox.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        introanimation: this.introAnimationCheckbox.checked,
      }),
    );
    this.interactionsEnabledCheckbox.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        interactions: this.interactionsEnabledCheckbox.checked,
      }),
    );
    this.mouseTrackingCheckbox.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        mousetracking: this.mouseTrackingCheckbox.checked,
      }),
    );
    this.headPattingCheckbox.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        headpatting: this.headPattingCheckbox.checked,
      }),
    );
    this.voiceEnabledCheckbox.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        voicelines: this.voiceEnabledCheckbox.checked,
      }),
    );
    this.mutedCheckbox.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({ muted: this.mutedCheckbox.checked }),
    );
    this.voiceVolumeSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({
        voicevolume: Number(this.voiceVolumeSlider.value),
      }),
    );
    this.dialogueAutoPlayCheckbox.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        dialogueautoplay: this.dialogueAutoPlayCheckbox.checked,
      }),
    );
    this.dialogueLanguagePresetSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        dialoguelanguagepreset: this.dialogueLanguagePresetSelect.value,
      }),
    );
    this.voiceLanguageSelect.addEventListener("change", () =>
      this.setVoiceLocale(this.voiceLanguageSelect.value as VoiceLocale),
    );
    this.showSubtitlesCheckbox.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        showsubtitles: this.showSubtitlesCheckbox.checked,
      }),
    );
    this.primarySubtitleLanguageSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        subtitlelanguage: this.primarySubtitleLanguageSelect.value,
      }),
    );
    this.showSecondarySubtitlesCheckbox.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        showsecondarysubtitles: this.showSecondarySubtitlesCheckbox.checked,
      }),
    );
    this.secondarySubtitleLanguageSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        secondarysubtitlelanguage: this.secondarySubtitleLanguageSelect.value,
      }),
    );
    this.subtitleAlignmentSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        subtitlealignment: this.subtitleAlignmentSelect.value,
      }),
    );
    this.subtitlePositionSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        subtitleposition: this.subtitlePositionSelect.value,
      }),
    );
    this.subtitleXSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({
        subtitlex: Number(this.subtitleXSlider.value),
      }),
    );
    this.subtitleYSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({
        subtitley: Number(this.subtitleYSlider.value),
      }),
    );
    this.bgmVolumeSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({
        bgmvolume: Number(this.bgmVolumeSlider.value),
      }),
    );
    this.fpsSlider.addEventListener("input", () =>
      this.adapter.setUserPropertiesForDebug({
        fpslimit: Number(this.fpsSlider.value),
      }),
    );
    this.renderResolutionSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        renderresolution: this.renderResolutionSelect.value,
      }),
    );
    this.modelResolutionSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        modelresolution: this.modelResolutionSelect.value,
      }),
    );
    this.panelLanguageSelect.addEventListener("change", () =>
      this.adapter.setUserPropertiesForDebug({
        panellanguage: this.panelLanguageSelect.value,
      }),
    );
    this.hitboxesButton.addEventListener("click", () =>
      this.adapter.setUserPropertiesForDebug({
        drawhitboxes: !this.settings.drawHitboxes,
      }),
    );
    this.restoreHostSettingsButton.addEventListener("click", () =>
      this.adapter.clearSessionOverrides(),
    );
  }

  private setHostPaused(paused: boolean) {
    this.hostPaused = paused;
    // WE's pause is the authoritative signal for an input-stream suspension:
    // the mid-gesture pointerup is lost, so drop any active interaction and
    // its pointer capture here instead of leaking it until a stale event.
    if (paused) this.pointerController?.cancelActive();
    this.syncPausedState();
    this.syncDebugControls(this.settings);
  }

  private readonly primeVoiceFromGesture = () => {
    if (!this.settings.voiceEnabled || this.settings.muted || this.isPaused()) return;
    const dialogue = this.options.definition.dialogues.find(
      (candidate) => candidate.index === this.dialoguePlayback.nextIndex,
    );
    const eventId = dialogue?.lines[0]?.id;
    if (eventId) this.voice.prime(eventId, this.settings.voiceLocale);
  };

  private readonly unlockBgmFromGesture = (event: Event) => {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("#debug-muted, #debug-replay-intro")
    ) {
      return;
    }
    if (this.settings.muted || this.isPaused()) return;
    void this.bgm.retryFromUserGesture().then((playing) => {
      if (playing) this.removeBgmUnlockListeners();
    });
  };

  private removeBgmUnlockListeners() {
    window.removeEventListener("pointerdown", this.unlockBgmFromGesture, true);
    window.removeEventListener("keydown", this.unlockBgmFromGesture, true);
  }

  private replaySession(): boolean {
    if (!this.renderer) return false;
    this.voice.stop();
    this.subtitle.hide();
    this.dialoguePlayback.reset();
    this.lastSpineEvent = "—";
    this.eventLabel.textContent = "—";
    this.lastAction = "—";
    this.lastActionLabel.textContent = "—";
    this.renderer.playInitialSequence(this.settings.introAnimation);
    if (!this.settings.muted) {
      void this.bgm.restartFromUserGesture();
    } else {
      this.bgm.rewind();
    }
    return true;
  }

  private setVoiceLocale(locale: VoiceLocale) {
    this.adapter.setUserPropertiesForDebug({ voicelanguage: locale });
  }

  private syncDebugControls(settings: Readonly<WallpaperSettings>) {
    const visibility = resolvePropertyGroupVisibility(settings);
    const voiceVolume = Math.round(settings.voiceVolume * 100);
    const bgmVolume = Math.round(settings.bgmVolume * 100);
    const panelFps = Math.min(Math.max(settings.fpsLimit || 15, 15), 160);
    this.qualityPresetSelect.value = settings.qualityPreset;
    this.qualityCustomControls.hidden = !visibility.qualityCustom;
    this.positionPresetSelect.value = settings.positionPreset;
    this.positionCustomControls.hidden = !visibility.positionCustom;
    this.panelPositionPresetSelect.value = settings.panelPositionPreset;
    this.panelPositionCustomControls.hidden = !visibility.panelPositionCustom;
    this.panelScaleSlider.value = String(settings.panelScale);
    this.panelScaleOutput.value = settings.panelScale.toFixed(2);
    this.panelXSlider.value = String(settings.panelX);
    this.panelXOutput.value = String(settings.panelX);
    this.panelYSlider.value = String(settings.panelY);
    this.panelYOutput.value = String(settings.panelY);
    this.modelScaleSlider.value = String(settings.modelScale);
    this.modelScaleOutput.value = settings.modelScale.toFixed(2);
    this.modelXSlider.value = String(settings.modelX);
    this.modelXOutput.value = String(settings.modelX);
    this.modelYSlider.value = String(settings.modelY);
    this.modelYOutput.value = String(settings.modelY);
    this.modelRotationSlider.value = String(settings.modelRotation);
    this.modelRotationOutput.value = `${settings.modelRotation}°`;
    this.interactionPresetSelect.value = settings.interactionPreset;
    this.interactionCustomControls.hidden = !visibility.interactionCustom;
    this.introAnimationCheckbox.checked = settings.introAnimation;
    this.interactionsEnabledCheckbox.checked = settings.interactionsEnabled;
    this.mouseTrackingCheckbox.checked = settings.mouseTracking;
    this.headPattingCheckbox.checked = settings.headPatting;
    this.voiceEnabledCheckbox.checked = settings.voiceEnabled;
    this.interactionDependentControls.hidden = !visibility.interactionChildren;
    this.mutedCheckbox.checked = settings.muted;
    this.voiceVolumeControl.hidden = !visibility.voiceVolume;
    this.voiceVolumeSlider.value = String(voiceVolume);
    this.voiceVolumeOutput.value = `${voiceVolume}%`;
    this.dialoguePlaybackGroup.hidden = !visibility.dialogueControls;
    this.dialogueAutoPlayCheckbox.checked = settings.dialogueAutoPlay;
    this.dialogueLanguagePresetSelect.value = settings.dialogueLanguagePreset;
    this.dialogueCustomControls.hidden = !visibility.dialogueCustom;
    this.voiceLanguageSelect.value = settings.voiceLocale;
    this.showSubtitlesCheckbox.checked = settings.subtitlesEnabled;
    this.primarySubtitleLanguageControl.hidden =
      !visibility.primarySubtitleLanguage;
    this.primarySubtitleLanguageSelect.value = settings.primarySubtitleLocale;
    this.showSecondarySubtitlesControl.hidden = !visibility.secondarySubtitles;
    this.showSecondarySubtitlesCheckbox.checked =
      settings.secondarySubtitlesEnabled;
    this.secondarySubtitleLanguageControl.hidden =
      !visibility.secondarySubtitleLanguage;
    this.secondarySubtitleLanguageSelect.value = settings.secondarySubtitleLocale;
    this.subtitleAlignmentSelect.value = settings.subtitleAlignment;
    this.subtitlePositionSelect.value = settings.subtitlePosition;
    this.subtitleCustomPositionControls.hidden =
      !visibility.subtitleCustomPosition;
    this.subtitleXSlider.value = String(settings.subtitleX);
    this.subtitleXOutput.value = String(settings.subtitleX);
    this.subtitleYSlider.value = String(settings.subtitleY);
    this.subtitleYOutput.value = String(settings.subtitleY);
    this.bgmVolumeControl.hidden = !visibility.bgmVolume;
    this.bgmVolumeSlider.value = String(bgmVolume);
    this.bgmVolumeOutput.value = `${bgmVolume}%`;
    this.fpsSlider.value = String(panelFps);
    this.fpsOutput.value = `${panelFps} FPS`;
    this.renderResolutionSelect.value = settings.renderResolution;
    this.modelResolutionSelect.value = settings.modelResolution;
    this.panelLanguageSelect.value = settings.panelLocale;
    this.updateFpsLabel();
    const text = this.panelText;
    this.hitboxesButton.textContent = settings.drawHitboxes
      ? text.hideHitboxes
      : text.showHitboxes;
    this.restoreHostSettingsButton.disabled = !this.adapter.hasSessionOverrides;
  }

  private readonly syncPausedState = () => {
    this.lastFrameTime = performance.now() / 1000;
    this.frameLimiter.reset();
    this.resetPerformanceWindow();
    const paused = this.isPaused();
    if (paused) this.measuredFps = 0;
    this.updateFpsLabel();
    this.voice.setPaused(paused);
    this.bgm.setPaused(paused);
    if (!this.startupComplete) {
      this.setPhase("loading");
      return;
    }
    if (paused) this.setPhase("paused");
    else if (this.phase !== "error") this.setPhase("running");
  };

  private isPaused() {
    return this.hostPaused || this.rendererUnavailable || document.hidden;
  }

  private handleRendererContextLost() {
    this.options.logger.warn("error", "WebGL context lost");
    this.rendererUnavailable = true;
    this.lastFrameTime = performance.now() / 1000;
    this.frameLimiter.reset();
    this.resetPerformanceWindow();
    this.measuredFps = 0;
    this.updateFpsLabel();
    this.voice.setPaused(true);
    this.bgm.setPaused(true);
    this.setPhase("loading");
  }

  private handleRendererContextRestored() {
    this.options.logger.info("lifecycle", "WebGL context restored");
    this.rendererUnavailable = false;
    this.syncPausedState();
    this.updateViewportLabel();
  }

  private recordRenderPerformance(
    timestampMilliseconds: number,
    renderMilliseconds: number,
  ) {
    this.performanceFrameCount += 1;
    this.performanceRenderTotal += renderMilliseconds;
    this.performanceRenderMaximum = Math.max(
      this.performanceRenderMaximum,
      renderMilliseconds,
    );
    const elapsed = timestampMilliseconds - this.performanceWindowStartedAt;
    if (elapsed < 1000) return;
    this.measuredFps = Number(
      ((this.performanceFrameCount * 1000) / elapsed).toFixed(1),
    );
    this.averageRenderMilliseconds = Number(
      (this.performanceRenderTotal / this.performanceFrameCount).toFixed(3),
    );
    this.maximumRenderMilliseconds = Number(
      this.performanceRenderMaximum.toFixed(3),
    );
    this.root.dataset.actualFps = String(this.measuredFps);
    this.root.dataset.averageRenderMs = String(this.averageRenderMilliseconds);
    this.root.dataset.maximumRenderMs = String(this.maximumRenderMilliseconds);
    this.updateFpsLabel();
    this.resetPerformanceWindow(timestampMilliseconds);
  }

  private updateFpsLabel() {
    const currentFps = this.measuredFps.toFixed(1).replace(/\.0$/, "");
    const limit =
      this.settings.fpsLimit === 0
        ? this.panelText.unlimited
        : String(this.settings.fpsLimit);
    this.fpsLabel.textContent = `${currentFps}/${limit}`;
  }

  private resetPerformanceWindow(startedAt = performance.now()) {
    this.performanceWindowStartedAt = startedAt;
    this.performanceFrameCount = 0;
    this.performanceRenderTotal = 0;
    this.performanceRenderMaximum = 0;
  }

  private setPhase(phase: Phase) {
    const previousPhase = this.phase;
    this.phase = phase;
    this.root.dataset.phase = phase;
    this.phaseLabel.textContent = this.panelText.phases[phase];
    this.loadingLabel.textContent = this.panelText.loadingSpine;
    this.loading.hidden = phase === "running" || phase === "paused" || phase === "error";
    if (previousPhase !== phase) {
      this.options.logger.info("lifecycle", "application phase changed", {
        from: previousPhase,
        to: phase,
      });
    }
  }

  private fail(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(error);
    this.options.logger.error("error", "application error", error);
    this.setPhase("error");
    this.errorLabel.hidden = false;
    this.errorLabel.textContent = message;
    this.debugPanelExpanded = true;
    this.syncDebugPanelVisibility();
  }

  private updateViewportLabel() {
    const snapshot = this.renderer?.getSnapshot();
    const viewport = snapshot?.viewport;
    if (!viewport || !snapshot) return;
    this.viewportLabel.textContent = `${Math.round(viewport.width)}×${Math.round(viewport.height)}`;
    const preset = RENDER_RESOLUTIONS[viewport.preset];
    const modelResolution = MODEL_RESOLUTIONS[snapshot.modelResolution];
    this.renderResolutionLabel.textContent =
      `${preset.label} · ${viewport.renderWidth}×${viewport.renderHeight}` +
      ` · ${modelResolution.label} texture`;
  }

  private updateBgmLabel(status: BgmStatus) {
    const snapshot = this.bgm.getSnapshot();
    this.bgmLabel.textContent = this.settings.muted
      ? this.panelText.muted
      : `${this.panelText.bgmStates[status]} · ${Math.round(this.settings.bgmVolume * 100)}%`;
    this.bgmLabel.dataset.currentTime = String(snapshot.currentTime);
  }

  private syncPanelText() {
    const text = this.panelText;
    document.documentElement.lang = this.settings.panelLocale === "en" ? "en" : "zh-CN";
    this.statusPanel.setAttribute("aria-label", text.panelAria);
    for (const element of this.statusPanel.querySelectorAll<HTMLElement>("[data-panel-text]")) {
      const key = element.dataset.panelText as keyof PanelText | undefined;
      const value = key ? text[key] : undefined;
      if (typeof value === "string") element.textContent = value;
    }
    for (const element of this.statusPanel.querySelectorAll<HTMLElement>("[data-panel-aria]")) {
      const key = element.dataset.panelAria as keyof PanelText | undefined;
      const value = key ? text[key] : undefined;
      if (typeof value === "string") element.setAttribute("aria-label", value);
    }
    this.syncPropertyGroupToggleLabels();
    this.phaseLabel.textContent = text.phases[this.phase];
    this.interactionLabel.textContent = text.interactions[this.interactionMode];
    this.lastActionLabel.textContent =
      this.lastAction === "—"
        ? "—"
        : text.interactions[this.lastAction as InteractionMode];
    this.loadingLabel.textContent = text.loadingSpine;
    const title = resolveLocalizedText(this.settings.panelLocale, this.options.titleByLocale);
    if (title !== undefined) this.titleLabel.textContent = title;
    this.logViewerController.setLocale(this.settings.panelLocale);
    this.syncLogToggleButton();
    this.syncDebugPanelVisibility();
  }

  private syncLogToggleButton() {
    const value = this.logViewerController.isOpen
      ? this.panelText.closeLogs
      : this.panelText.openLogs;
    this.openLogsButton.textContent = value;
    this.openLogsButton.setAttribute("aria-label", value);
  }

  private syncDebugPanelVisibility() {
    const available = this.debugFromQuery || this.settings.debugPanelEnabled;
    if (!available) this.debugPanelExpanded = false;
    const expanded = available && this.debugPanelExpanded;

    this.debugPanelToggle.hidden = !available;
    this.debugPanelToggle.disabled = !available;
    this.debugPanelToggle.setAttribute("aria-expanded", String(expanded));
    this.debugPanelToggle.textContent = expanded
      ? this.panelText.hideDebugPanel
      : this.panelText.showDebugPanel;
    this.debugPanelToggle.setAttribute("aria-label", this.debugPanelToggle.textContent);
    this.statusPanel.classList.toggle("status-panel--visible", expanded);
    this.statusPanel.setAttribute("aria-hidden", String(!expanded));
    this.debugPanelPointerController.refresh();
  }

  private syncDebugPanelLayout(settings: Readonly<WallpaperSettings>) {
    this.statusPanel.style.setProperty(
      "--debug-panel-scale",
      String(settings.panelScale),
    );
    this.logViewer.style.setProperty(
      "--debug-panel-scale",
      String(settings.panelScale),
    );
    this.debugPanelToggle.style.setProperty(
      "--debug-panel-scale",
      String(settings.panelScale),
    );
    this.statusPanel.style.setProperty("--debug-panel-x", `${settings.panelX}px`);
    this.statusPanel.style.setProperty("--debug-panel-y", `${settings.panelY}px`);
    this.debugPanelPointerController.refresh();
  }

  private togglePropertyGroup(button: HTMLButtonElement) {
    const group = button.closest<HTMLElement>(".status-panel__property-group");
    if (!group) return;
    const expanded = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(expanded));
    group.classList.toggle("status-panel__property-group--collapsed", !expanded);
    this.syncPropertyGroupToggleLabel(button);
    this.debugPanelPointerController.refresh();
  }

  private syncPropertyGroupToggleLabels() {
    for (const button of this.propertyGroupToggleButtons) {
      this.syncPropertyGroupToggleLabel(button);
    }
    for (const button of this.subgroupToggleButtons) {
      this.syncPropertyGroupToggleLabel(button);
    }
  }

  private toggleSubgroup(button: HTMLButtonElement) {
    const group = button.closest<HTMLElement>(".status-panel__nested-controls");
    if (!group) return;
    const expanded = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(expanded));
    group.classList.toggle("status-panel__nested-controls--collapsed", !expanded);
    this.syncPropertyGroupToggleLabel(button);
    this.debugPanelPointerController.refresh();
  }

  private syncPropertyGroupToggleLabel(button: HTMLButtonElement) {
    const expanded = button.getAttribute("aria-expanded") === "true";
    const groupTitle = button.querySelector<HTMLElement>("[data-panel-text]")
      ?.textContent?.trim();
    if (!groupTitle) return;
    const action = expanded
      ? this.panelText.collapseSection
      : this.panelText.expandSection;
    const label = `${action}: ${groupTitle}`;
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  private get panelText(): PanelText {
    return (this.options.panelText ?? PANEL_TEXT)[this.settings.panelLocale];
  }

  private drawInteractionOverlay() {
    const geometry = this.renderer?.getInteractionGeometry();
    if (!geometry) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(Math.round(this.interactionOverlay.clientWidth * pixelRatio), 1);
    const height = Math.max(Math.round(this.interactionOverlay.clientHeight * pixelRatio), 1);
    if (this.interactionOverlay.width !== width) this.interactionOverlay.width = width;
    if (this.interactionOverlay.height !== height) this.interactionOverlay.height = height;
    const context = this.interactionOverlay.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.save();
    context.scale(pixelRatio, pixelRatio);
    context.lineWidth = 2;
    context.setLineDash([7, 5]);
    context.strokeStyle = "rgba(255, 126, 158, 0.85)";
    context.beginPath();
    context.ellipse(
      geometry.head.x,
      geometry.head.y,
      geometry.head.radiusX,
      geometry.head.radiusY,
      geometry.head.rotation,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.strokeStyle = "rgba(111, 202, 255, 0.75)";
    context.beginPath();
    context.ellipse(
      geometry.body.x,
      geometry.body.y,
      geometry.body.radiusX,
      geometry.body.radiusY,
      geometry.body.rotation,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
  }

  private clearInteractionOverlay() {
    const context = this.interactionOverlay.getContext("2d");
    context?.clearRect(0, 0, this.interactionOverlay.width, this.interactionOverlay.height);
  }

  private getElement<T extends typeof Element>(id: string, constructor: T): InstanceType<T> {
    const element = document.getElementById(id);
    if (!(element instanceof constructor)) throw new Error(`缺少页面元素 #${id}`);
    return element as InstanceType<T>;
  }
}
