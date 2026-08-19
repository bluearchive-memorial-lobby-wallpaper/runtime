import { calculateViewportLayout } from "../layout/viewport.js";
import {
  createModelRotationMatrix,
  modelRotationRadians,
  rotateModelPoint,
} from "../layout/modelTransform.js";
import {
  RENDER_RESOLUTIONS,
  type ModelResolution,
  type RenderResolution,
} from "../settings/resolution.js";
import { resetAndApplyPlaybackPose, updateSkeletonWorldTransform } from "./resetPlaybackPose.js";
import type { InteractiveWallpaperDefinition } from "../definition.js";
import type { HitRegion } from "../interaction/PointerInteractionController.js";

export interface SpineRendererSettings {
  readonly backgroundColor: readonly [number, number, number];
  readonly modelResolution: ModelResolution;
  readonly modelRotation: number;
  readonly modelScale: number;
  readonly modelX: number;
  readonly modelY: number;
  readonly renderResolution: RenderResolution;
}

export type InteractionMode = "intro" | "idle" | "dialogue" | "look" | "pat" | "cooldown";

export interface SpineEventDetail {
  name: string;
  stringValue: string;
  volume: number;
  balance: number;
  trackIndex: number;
}

export interface RendererCallbacks {
  onAnimationChange: (animation: string) => void;
  onInteractionModeChange: (mode: InteractionMode) => void;
  onSpineEvent: (event: SpineEventDetail) => void;
  onContextLost: () => void;
  onContextRestored: () => void;
  onError: (error: unknown) => void;
}

interface SpineData {
  skeleton: any;
  state: any;
  eyeBone: any;
  headControlBone: any;
  headAnchorBone: any;
  eyeBase: { x: number; y: number };
  headControlBase: { x: number; y: number };
}

interface TrackEntrySnapshot {
  animationName: string;
  empty: boolean;
  loop: boolean;
  activeDialogue: boolean;
  values: Record<string, number | boolean>;
  next?: TrackEntrySnapshot;
}

interface PlaybackSnapshot {
  tracks: Array<{ trackIndex: number; entry: TrackEntrySnapshot }>;
}

const TRACK_ENTRY_VALUES = [
  "animationStart",
  "animationEnd",
  "animationLast",
  "nextAnimationLast",
  "delay",
  "trackTime",
  "trackLast",
  "nextTrackLast",
  "trackEnd",
  "timeScale",
  "alpha",
  "interruptAlpha",
  "mixTime",
  "mixDuration",
  "mixBlend",
  "eventThreshold",
  "attachmentThreshold",
  "drawOrderThreshold",
  "holdPrevious",
] as const;

export interface InteractionGeometry {
  head: { x: number; y: number; radiusX: number; radiusY: number; rotation: number };
  body: { x: number; y: number; radiusX: number; radiusY: number; rotation: number };
}

const STRAIGHT_ALPHA_SCREEN_UNIFORM = "u_premultiplyStraightAlpha";

export class SpineRenderer {
  private readonly definition: InteractiveWallpaperDefinition<any>;
  private readonly canvas: HTMLCanvasElement;
  private readonly callbacks: RendererCallbacks;
  private readonly spine: any;
  private readonly gl: WebGLRenderingContext;
  private shader: any;
  private batcher: any;
  private readonly mvp: any;
  private readonly modelTransform: any;
  private skeletonRenderer: any;
  private assetManager: any;
  private spineData?: SpineData;
  private settings?: Readonly<SpineRendererSettings>;
  private currentAnimation = "—";
  private interactionMode: InteractionMode = "intro";
  private activeDialogue: number | null = null;
  private activeDialogueEntry?: any;
  private dialogueFallbackRemaining = 0;
  private cooldownRemaining = 0;
  private eyeBase = { x: 0, y: 0 };
  private eyeOffset = { x: 0, y: 0 };
  private eyeTarget = { x: 0, y: 0 };
  private headControlBase = { x: 0, y: 0 };
  private patOffset = 0;
  private patTarget = 0;
  private viewport = {
    width: 0,
    height: 0,
    pixelRatio: 1,
    renderWidth: 0,
    renderHeight: 0,
    preset: "1080p" as keyof typeof RENDER_RESOLUTIONS,
  };
  private worldRect = { left: 0, bottom: 0, width: 1, height: 1 };
  private modelResolution: ModelResolution = "4k";
  private modelLoadGeneration = 0;
  private restoringPlayback = false;
  private contextLost = false;
  private contextPlayback?: PlaybackSnapshot;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    definition: InteractiveWallpaperDefinition<any>,
    callbacks: RendererCallbacks,
  ) {
    this.canvas = canvas;
    this.definition = definition;
    this.callbacks = callbacks;
    this.spine = (globalThis as { spine?: any }).spine;
    if (!this.spine?.webgl) {
      throw new Error("Spine 3.8 WebGL Runtime 未加载。请先执行 npm run prepare:assets。");
    }

    const context =
      canvas.getContext("webgl", {
        alpha: false,
        antialias: true,
        premultipliedAlpha: false,
      }) ??
      (canvas.getContext("experimental-webgl", {
        alpha: false,
        antialias: true,
        premultipliedAlpha: false,
      }) as WebGLRenderingContext | null);
    if (!context) throw new Error("当前环境不支持 WebGL。");

    this.gl = context;
    this.installSpine38ScreenBlendFix();
    this.mvp = new this.spine.webgl.Matrix4();
    this.modelTransform = new this.spine.webgl.Matrix4();
    this.createGraphicsResources();
    this.assetManager = new this.spine.webgl.AssetManager(context);
    this.canvas.addEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.addEventListener("webglcontextrestored", this.handleContextRestored);
  }

  async initialize(modelResolution: ModelResolution = "4k") {
    this.spineData = await this.loadSpineData(this.assetManager, modelResolution);
    this.applyControlBoneBases(this.spineData);
    this.modelResolution = modelResolution;
    this.resize();
  }

  async setModelResolution(modelResolution: ModelResolution): Promise<boolean> {
    const generation = ++this.modelLoadGeneration;
    if (this.contextLost) return false;
    if (modelResolution === this.modelResolution) return false;
    const nextAssetManager = new this.spine.webgl.AssetManager(this.gl);
    try {
      const nextSpineData = await this.loadSpineData(
        nextAssetManager,
        modelResolution,
      );
      if (generation !== this.modelLoadGeneration) {
        nextAssetManager.dispose();
        return false;
      }
      const playback = this.capturePlaybackState(this.requireData().state);
      const restoredDialogueEntry = this.restorePlaybackState(
        nextSpineData.state,
        playback,
      );
      const previousAssetManager = this.assetManager;
      this.assetManager = nextAssetManager;
      this.spineData = nextSpineData;
      this.applyControlBoneBases(nextSpineData);
      this.activeDialogueEntry = restoredDialogueEntry;
      this.modelResolution = modelResolution;
      previousAssetManager.dispose();
      this.resize();
      return true;
    } catch (error) {
      nextAssetManager.dispose();
      throw error;
    }
  }

  private async loadSpineData(
    assetManager: any,
    modelResolution: ModelResolution,
  ): Promise<SpineData> {
    const atlasPath = this.definition.model.atlases[modelResolution];
    assetManager.loadBinary(this.definition.model.binary);
    assetManager.loadTextureAtlas(atlasPath);
    await this.waitForAssets(assetManager);

    const atlas = assetManager.get(atlasPath);
    const atlasLoader = new this.spine.AtlasAttachmentLoader(atlas);
    const skeletonBinary = new this.spine.SkeletonBinary(atlasLoader);
    const skeletonData = skeletonBinary.readSkeletonData(
      assetManager.get(this.definition.model.binary),
    );
    if (skeletonData.version !== this.definition.model.spineVersion) {
      throw new Error(
        `Spine 版本不匹配：期望 ${this.definition.model.spineVersion}，实际 ${skeletonData.version}`,
      );
    }

    const skeleton = new this.spine.Skeleton(skeletonData);
    skeleton.setToSetupPose();
    updateSkeletonWorldTransform(skeleton);

    const animationStateData = new this.spine.AnimationStateData(skeletonData);
    animationStateData.defaultMix = 0.35;
    const state = new this.spine.AnimationState(animationStateData);
    state.addListener({
      start: (entry: any) => {
        if (!this.restoringPlayback) {
          this.setCurrentAnimation(entry.animation?.name ?? "—");
        }
      },
      complete: (entry: any) => this.handleAnimationComplete(entry),
      end: (entry: any) => this.handleAnimationEnd(entry),
      event: (entry: any, event: any) => {
        this.callbacks.onSpineEvent({
          name: event.data?.name ?? "",
          stringValue: event.stringValue ?? "",
          volume: event.volume ?? 1,
          balance: event.balance ?? 0,
          trackIndex: entry.trackIndex ?? -1,
        });
      },
    });

    const eyeBone = this.requireBone(skeleton, this.definition.interactions.eyeBone);
    const headControlBone = this.requireBone(skeleton, this.definition.interactions.headControlBone);
    const headAnchorBone = this.requireBone(skeleton, this.definition.interactions.headAnchorBone);
    return {
      skeleton,
      state,
      eyeBone,
      headControlBone,
      headAnchorBone,
      eyeBase: { x: eyeBone.x, y: eyeBone.y },
      headControlBase: { x: headControlBone.x, y: headControlBone.y },
    };
  }

  private capturePlaybackState(state: any): PlaybackSnapshot {
    const tracks: PlaybackSnapshot["tracks"] = [];
    for (let trackIndex = 0; trackIndex < state.tracks.length; trackIndex += 1) {
      const entry = state.tracks[trackIndex];
      if (!entry) continue;
      tracks.push({
        trackIndex,
        entry: this.captureTrackEntry(entry),
      });
    }
    return { tracks };
  }

  private captureTrackEntry(entry: any): TrackEntrySnapshot {
    const values: TrackEntrySnapshot["values"] = {};
    for (const key of TRACK_ENTRY_VALUES) {
      const value = entry[key];
      if (typeof value === "number" || typeof value === "boolean") {
        values[key] = value;
      }
    }
    return {
      animationName: entry.animation?.name ?? "",
      empty: entry.animation === this.spine.AnimationState.emptyAnimation,
      loop: Boolean(entry.loop),
      activeDialogue: entry === this.activeDialogueEntry,
      values,
      next: entry.next ? this.captureTrackEntry(entry.next) : undefined,
    };
  }

  private restorePlaybackState(
    state: any,
    snapshot: PlaybackSnapshot,
  ): any | undefined {
    let restoredDialogueEntry: any | undefined;
    this.restoringPlayback = true;
    try {
      for (const track of snapshot.tracks) {
        let entrySnapshot: TrackEntrySnapshot | undefined = track.entry;
        let queued = false;
        while (entrySnapshot) {
          const entry = this.createTrackEntry(
            state,
            track.trackIndex,
            entrySnapshot,
            queued,
          );
          for (const [key, value] of Object.entries(entrySnapshot.values)) {
            entry[key] = value;
          }
          if (entrySnapshot.activeDialogue) restoredDialogueEntry = entry;
          entrySnapshot = entrySnapshot.next;
          queued = true;
        }
      }
    } finally {
      this.restoringPlayback = false;
    }
    return restoredDialogueEntry;
  }

  private createTrackEntry(
    state: any,
    trackIndex: number,
    snapshot: TrackEntrySnapshot,
    queued: boolean,
  ) {
    const mixDuration = Number(snapshot.values.mixDuration ?? 0);
    const delay = Number(snapshot.values.delay ?? 0);
    if (snapshot.empty) {
      return queued
        ? state.addEmptyAnimation(trackIndex, mixDuration, delay)
        : state.setEmptyAnimation(trackIndex, mixDuration);
    }
    if (!snapshot.animationName) {
      throw new Error(`轨道 ${trackIndex} 缺少可恢复的动画名称。`);
    }
    return queued
      ? state.addAnimation(trackIndex, snapshot.animationName, snapshot.loop, delay)
      : state.setAnimation(trackIndex, snapshot.animationName, snapshot.loop);
  }

  private applyControlBoneBases(data: SpineData) {
    this.eyeBase = { ...data.eyeBase };
    this.headControlBase = { ...data.headControlBase };
  }

  playInitialSequence(withIntro: boolean) {
    const { skeleton, state } = this.requireData();
    this.resetInteractionOffsets();
    this.activeDialogue = null;
    this.activeDialogueEntry = undefined;
    this.dialogueFallbackRemaining = 0;
    this.cooldownRemaining = 0;
    resetAndApplyPlaybackPose(skeleton, state, () => {
      if (withIntro) {
        state.setAnimation(this.definition.animations.tracks.base, this.definition.animations.intro, false);
        state.addAnimation(this.definition.animations.tracks.base, this.definition.animations.idle, true, 0);
      } else {
        state.setAnimation(this.definition.animations.tracks.base, this.definition.animations.idle, true);
      }
    });
    this.setInteractionMode(withIntro ? "intro" : "idle");
  }

  playIntro() {
    this.playInitialSequence(true);
  }

  skipIntro(): boolean {
    if (!this.spineData || this.interactionMode !== "intro") return false;
    this.playIdle();
    return true;
  }

  playIdle() {
    const { skeleton, state } = this.requireData();
    this.activeDialogue = null;
    this.activeDialogueEntry = undefined;
    this.dialogueFallbackRemaining = 0;
    this.cooldownRemaining = 0;
    this.resetInteractionOffsets();
    resetAndApplyPlaybackPose(skeleton, state, () => {
      state.setAnimation(this.definition.animations.tracks.base, this.definition.animations.idle, true);
    });
    this.setInteractionMode("idle");
  }

  playDialogue(index: number): boolean {
    if (this.interactionMode !== "idle") return false;
    const dialogue = this.definition.dialogues.find((candidate) => candidate.index === index);
    if (!dialogue) return false;

    this.clearInteractionTracks();
    const { state } = this.requireData();
    const motionEntry = state.setAnimation(
      this.definition.animations.tracks.motion,
      dialogue.motionAnimation,
      false,
    );
    state.addEmptyAnimation(this.definition.animations.tracks.motion, 0.35, 0);
    state.setAnimation(this.definition.animations.tracks.attachment, dialogue.attachmentAnimation, false);
    state.addEmptyAnimation(this.definition.animations.tracks.attachment, 0.35, 0);
    this.activeDialogue = index;
    this.activeDialogueEntry = motionEntry;
    this.dialogueFallbackRemaining =
      dialogue.durationSeconds + this.definition.interactions.dialogueGraceSeconds;
    this.setInteractionMode("dialogue");
    return true;
  }

  beginLook(): boolean {
    if (this.interactionMode !== "idle") return false;
    this.clearInteractionTracks();
    const entry = this.requireData().state.setAnimation(
      this.definition.animations.tracks.motion,
      this.definition.interactions.look.animation,
      false,
    );
    entry.mixDuration = 0.16;
    this.setInteractionMode("look");
    return true;
  }

  updateLook(clientX: number, clientY: number) {
    if (this.interactionMode !== "look") return;
    const rect = this.canvas.getBoundingClientRect();
    const normalizedX = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * 2 - 1;
    const normalizedY = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1) * 2 - 1;
    this.eyeTarget = {
      x: -normalizedY * this.definition.interactions.eyeClamp.x,
      y: -normalizedX * this.definition.interactions.eyeClamp.y,
    };
  }

  endLook() {
    if (this.interactionMode !== "look") return;
    const { state } = this.requireData();
    this.eyeTarget = { x: 0, y: 0 };
    const motion = state.setAnimation(
      this.definition.animations.tracks.motion,
      this.definition.interactions.look.endMotionAnimation,
      false,
    );
    motion.mixDuration = 0;
    state.addEmptyAnimation(this.definition.animations.tracks.motion, 0.35, 0);
    const attachment = state.setAnimation(
      this.definition.animations.tracks.attachment,
      this.definition.interactions.look.endAttachmentAnimation,
      false,
    );
    attachment.mixDuration = 0;
    state.addEmptyAnimation(this.definition.animations.tracks.attachment, 0.35, 0);
    this.beginCooldown();
  }

  beginPat(): boolean {
    if (this.interactionMode !== "idle") return false;
    this.clearInteractionTracks();
    const { state } = this.requireData();
    state.setAnimation(this.definition.animations.tracks.motion, this.definition.interactions.pat.motionAnimation, false);
    state.setAnimation(
      this.definition.animations.tracks.attachment,
      this.definition.interactions.pat.attachmentAnimation,
      false,
    );
    this.setInteractionMode("pat");
    return true;
  }

  updatePat(deltaX: number, deltaY: number) {
    if (this.interactionMode !== "pat") return;
    const next = this.patTarget + (deltaX - deltaY * 0.35) * 0.32;
    this.patTarget = Math.min(
      Math.max(next, -this.definition.interactions.patClamp),
      this.definition.interactions.patClamp,
    );
  }

  endPat() {
    if (this.interactionMode !== "pat") return;
    const { state } = this.requireData();
    this.patTarget = 0;
    state.setAnimation(
      this.definition.animations.tracks.motion,
      this.definition.interactions.pat.endMotionAnimation,
      false,
    );
    state.addEmptyAnimation(this.definition.animations.tracks.motion, 0.35, 0);
    state.setAnimation(
      this.definition.animations.tracks.attachment,
      this.definition.interactions.pat.endAttachmentAnimation,
      false,
    );
    state.addEmptyAnimation(this.definition.animations.tracks.attachment, 0.35, 0);
    this.beginCooldown();
  }

  cancelInteraction() {
    if (this.interactionMode === "look") this.endLook();
    else if (this.interactionMode === "pat") this.endPat();
  }

  hitTest(clientX: number, clientY: number): HitRegion {
    if (this.interactionMode !== "idle") return "background";
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const geometry = this.getInteractionGeometry();
    if (!geometry) return "background";
    if (this.insideEllipse(x, y, geometry.head)) return "head";
    if (this.insideEllipse(x, y, geometry.body)) return "body";
    return "background";
  }

  getInteractionGeometry(): InteractionGeometry | null {
    const data = this.spineData;
    if (!data) return null;
    const headWorld = { x: data.headAnchorBone.worldX, y: data.headAnchorBone.worldY };
    const modelRotation = this.settings?.modelRotation ?? 0;
    const pivot = {
      x: this.definition.model.designViewport.centerX,
      y: this.definition.model.designViewport.centerY,
    };
    const rotatedHeadWorld = rotateModelPoint(headWorld, modelRotation, pivot);
    const head = this.worldToCanvas(rotatedHeadWorld.x, rotatedHeadWorld.y);
    const bodyWorld = {
      x: headWorld.x + this.definition.interactions.bodyFromHead.x,
      y: headWorld.y + this.definition.interactions.bodyFromHead.y,
    };
    const rotatedBodyWorld = rotateModelPoint(bodyWorld, modelRotation, pivot);
    const body = this.worldToCanvas(rotatedBodyWorld.x, rotatedBodyWorld.y);
    const scaleX = this.viewport.width / this.worldRect.width;
    const scaleY = this.viewport.height / this.worldRect.height;
    const canvasRotation = -modelRotationRadians(modelRotation);
    return {
      head: {
        ...head,
        radiusX: this.definition.interactions.headRadius.x * scaleX,
        radiusY: this.definition.interactions.headRadius.y * scaleY,
        rotation: canvasRotation,
      },
      body: {
        ...body,
        radiusX: this.definition.interactions.bodyFromHead.radiusX * scaleX,
        radiusY: this.definition.interactions.bodyFromHead.radiusY * scaleY,
        rotation: canvasRotation,
      },
    };
  }

  applySettings(settings: Readonly<SpineRendererSettings>) {
    this.settings = settings;
    this.resize();
  }

  updateAndRender(deltaSeconds: number): boolean {
    if (this.contextLost) return false;
    const { skeleton, state, eyeBone, headControlBone } = this.requireData();
    const [red, green, blue] = this.settings?.backgroundColor ?? [0.035, 0.055, 0.11];

    this.gl.clearColor(red, green, blue, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.updateInteractionOffsets(deltaSeconds);
    state.update(deltaSeconds);
    state.apply(skeleton);
    eyeBone.x = this.eyeBase.x + this.eyeOffset.x;
    eyeBone.y = this.eyeBase.y + this.eyeOffset.y;
    headControlBone.x = this.headControlBase.x;
    headControlBone.y = this.headControlBase.y + this.patOffset;
    updateSkeletonWorldTransform(skeleton);

    this.shader.bind();
    this.shader.setUniformi(this.spine.webgl.Shader.SAMPLER, 0);
    this.shader.setUniform4x4f(this.spine.webgl.Shader.MVP_MATRIX, this.mvp.values);
    this.shader.setUniformf(STRAIGHT_ALPHA_SCREEN_UNIFORM, 0);
    this.batcher.begin(this.shader);
    this.skeletonRenderer.premultipliedAlpha = false;
    this.skeletonRenderer.draw(this.batcher, skeleton);
    this.batcher.end();
    this.shader.unbind();
    return true;
  }

  resize() {
    if (this.contextLost) return;
    const cssWidth = Math.max(this.canvas.clientWidth, 1);
    const cssHeight = Math.max(this.canvas.clientHeight, 1);
    const preset = this.settings?.renderResolution ?? "1080p";
    const maximumViewport = this.gl.getParameter(this.gl.MAX_VIEWPORT_DIMS) as Int32Array;
    const layout = calculateViewportLayout({
      cssWidth,
      cssHeight,
      requestedHeight: RENDER_RESOLUTIONS[preset].height,
      maximumWidth: maximumViewport[0] ?? Number.MAX_SAFE_INTEGER,
      maximumHeight: maximumViewport[1] ?? Number.MAX_SAFE_INTEGER,
      modelScale: this.settings?.modelScale ?? 1,
      modelX: this.settings?.modelX ?? 0,
      modelY: this.settings?.modelY ?? 0,
      designViewport: this.definition.model.designViewport,
    });
    const { pixelWidth, pixelHeight, pixelRatio, worldRect } = layout;

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }

    this.mvp.ortho2d(
      worldRect.left,
      worldRect.bottom,
      worldRect.width,
      worldRect.height,
    );
    this.modelTransform.set(
      createModelRotationMatrix(this.settings?.modelRotation ?? 0, {
        x: this.definition.model.designViewport.centerX,
        y: this.definition.model.designViewport.centerY,
      }),
    );
    this.mvp.multiply(this.modelTransform);
    this.gl.viewport(0, 0, pixelWidth, pixelHeight);
    this.viewport = {
      width: cssWidth,
      height: cssHeight,
      pixelRatio,
      renderWidth: pixelWidth,
      renderHeight: pixelHeight,
      preset,
    };
    this.worldRect = worldRect;
  }

  getSnapshot() {
    return {
      animation: this.currentAnimation,
      interactionMode: this.interactionMode,
      activeDialogue: this.activeDialogue,
      dialogueFallbackRemaining: Number(this.dialogueFallbackRemaining.toFixed(3)),
      cooldownRemaining: Number(this.cooldownRemaining.toFixed(3)),
      viewport: { ...this.viewport },
      worldRect: { ...this.worldRect },
      geometry: this.getInteractionGeometry(),
      eyeOffset: { ...this.eyeOffset },
      patOffset: this.patOffset,
      modelLoaded: Boolean(this.spineData),
      modelResolution: this.modelResolution,
      skeletonVersion: this.spineData?.skeleton.data.version ?? null,
      contextLost: this.contextLost,
    };
  }

  simulateContextLossForDebug(restoreAfterMilliseconds = 350): boolean {
    const extension = this.gl.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    extension.loseContext();
    window.setTimeout(
      () => extension.restoreContext(),
      Math.max(restoreAfterMilliseconds, 0),
    );
    return true;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.modelLoadGeneration += 1;
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleContextRestored);
    if (!this.contextLost) {
      this.assetManager.dispose();
      this.shader.dispose();
      this.batcher.dispose();
    }
  }

  private readonly handleContextLost = (event: Event) => {
    event.preventDefault();
    if (this.disposed || this.contextLost) return;
    this.contextLost = true;
    this.modelLoadGeneration += 1;
    this.contextPlayback = this.spineData
      ? this.capturePlaybackState(this.spineData.state)
      : undefined;
    this.callbacks.onContextLost();
  };

  private readonly handleContextRestored = () => {
    if (this.disposed || !this.contextLost) return;
    void this.restoreContext().catch((error) => this.callbacks.onError(error));
  };

  private async restoreContext() {
    const generation = ++this.modelLoadGeneration;
    const playback = this.contextPlayback;
    const targetResolution = this.settings?.modelResolution ?? this.modelResolution;
    this.createGraphicsResources();
    const nextAssetManager = new this.spine.webgl.AssetManager(this.gl);
    try {
      const nextSpineData = await this.loadSpineData(
        nextAssetManager,
        targetResolution,
      );
      if (this.disposed || generation !== this.modelLoadGeneration) {
        nextAssetManager.dispose();
        return;
      }
      const restoredDialogueEntry = playback
        ? this.restorePlaybackState(nextSpineData.state, playback)
        : undefined;
      this.assetManager = nextAssetManager;
      this.spineData = nextSpineData;
      this.applyControlBoneBases(nextSpineData);
      this.activeDialogueEntry = restoredDialogueEntry;
      this.modelResolution = targetResolution;
      this.contextPlayback = undefined;
      this.contextLost = false;
      this.resize();
      this.callbacks.onContextRestored();
    } catch (error) {
      nextAssetManager.dispose();
      throw error;
    }
  }

  private handleAnimationComplete(entry: any) {
    const name = entry.animation?.name ?? "";
    if (entry.trackIndex === this.definition.animations.tracks.base && name === this.definition.animations.intro) {
      this.setInteractionMode("idle");
      return;
    }
    const dialogue = this.definition.dialogues.find((candidate) => candidate.index === this.activeDialogue);
    if (
      this.interactionMode === "dialogue" &&
      entry.trackIndex === this.definition.animations.tracks.motion &&
      name === dialogue?.motionAnimation
    ) {
      this.finishDialogue(entry);
    }
  }

  private handleAnimationEnd(entry: any) {
    if (entry.trackIndex !== this.definition.animations.tracks.motion) return;
    this.finishDialogue(entry);
  }

  private finishDialogue(entry?: any) {
    if (this.interactionMode !== "dialogue") return;
    if (entry && entry !== this.activeDialogueEntry) return;
    this.activeDialogue = null;
    this.activeDialogueEntry = undefined;
    this.dialogueFallbackRemaining = 0;
    this.beginCooldown();
  }

  private beginCooldown() {
    this.cooldownRemaining = this.definition.interactions.cooldownSeconds;
    this.setInteractionMode("cooldown");
  }

  private updateInteractionOffsets(deltaSeconds: number) {
    const smoothing = 1 - Math.exp(-deltaSeconds * 14);
    this.eyeOffset.x += (this.eyeTarget.x - this.eyeOffset.x) * smoothing;
    this.eyeOffset.y += (this.eyeTarget.y - this.eyeOffset.y) * smoothing;
    this.patOffset += (this.patTarget - this.patOffset) * smoothing;

    if (this.interactionMode === "dialogue") {
      this.dialogueFallbackRemaining = Math.max(
        this.dialogueFallbackRemaining - deltaSeconds,
        0,
      );
      if (this.dialogueFallbackRemaining === 0) this.finishDialogue();
    }

    if (this.interactionMode !== "cooldown") return;
    this.cooldownRemaining = Math.max(this.cooldownRemaining - deltaSeconds, 0);
    if (this.cooldownRemaining > 0) return;
    this.eyeOffset = { x: 0, y: 0 };
    this.eyeTarget = { x: 0, y: 0 };
    this.patOffset = 0;
    this.patTarget = 0;
    this.setInteractionMode("idle");
  }

  private resetInteractionOffsets() {
    this.eyeOffset = { x: 0, y: 0 };
    this.eyeTarget = { x: 0, y: 0 };
    this.patOffset = 0;
    this.patTarget = 0;
  }

  private clearInteractionTracks() {
    const { state } = this.requireData();
    state.clearTrack(this.definition.animations.tracks.motion);
    state.clearTrack(this.definition.animations.tracks.attachment);
    this.resetInteractionOffsets();
  }

  private setCurrentAnimation(animation: string) {
    this.currentAnimation = animation;
    this.callbacks.onAnimationChange(animation);
  }

  private setInteractionMode(mode: InteractionMode) {
    if (this.interactionMode === mode) return;
    this.interactionMode = mode;
    this.callbacks.onInteractionModeChange(mode);
  }

  private worldToCanvas(worldX: number, worldY: number) {
    return {
      x: ((worldX - this.worldRect.left) / this.worldRect.width) * this.viewport.width,
      y:
        this.viewport.height -
        ((worldY - this.worldRect.bottom) / this.worldRect.height) * this.viewport.height,
    };
  }

  private insideEllipse(
    x: number,
    y: number,
    ellipse: {
      x: number;
      y: number;
      radiusX: number;
      radiusY: number;
      rotation: number;
    },
  ) {
    const deltaX = x - ellipse.x;
    const deltaY = y - ellipse.y;
    const cosine = Math.cos(-ellipse.rotation);
    const sine = Math.sin(-ellipse.rotation);
    const localX = cosine * deltaX - sine * deltaY;
    const localY = sine * deltaX + cosine * deltaY;
    const normalizedX = localX / ellipse.radiusX;
    const normalizedY = localY / ellipse.radiusY;
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }

  private installSpine38ScreenBlendFix() {
    const converter = this.spine.webgl.WebGLBlendModeConverter;
    if (!converter) return;
    if (converter.__spine38ScreenBlendFixed) return;
    const originalGetDestination = converter.getDestGLBlendMode.bind(converter);
    converter.getDestGLBlendMode = (blendMode: number) =>
      blendMode === this.spine.BlendMode.Screen
        ? this.gl.ONE_MINUS_SRC_COLOR
        : originalGetDestination(blendMode);
    converter.__spine38ScreenBlendFixed = true;
  }

  private createGraphicsResources() {
    this.shader = this.createStraightAlphaCompatibleShader();
    this.batcher = new this.spine.webgl.PolygonBatcher(this.gl);
    this.installStraightAlphaScreenBatchFix();
    this.skeletonRenderer = new this.spine.webgl.SkeletonRenderer(this.gl);
  }

  private createStraightAlphaCompatibleShader() {
    const shaderApi = this.spine.webgl.Shader;
    const template = shaderApi.newTwoColoredTextured(this.gl);
    const vertexShader = template.getVertexShaderSource();
    template.dispose();

    const fragmentShader = `
      #ifdef GL_ES
        #define LOWP lowp
        precision mediump float;
      #else
        #define LOWP
      #endif
      varying LOWP vec4 v_light;
      varying LOWP vec4 v_dark;
      varying vec2 v_texCoords;
      uniform sampler2D u_texture;
      uniform float ${STRAIGHT_ALPHA_SCREEN_UNIFORM};

      void main () {
        vec4 texColor = texture2D(u_texture, v_texCoords);
        gl_FragColor.a = texColor.a * v_light.a;
        gl_FragColor.rgb = ((texColor.a - 1.0) * v_dark.a + 1.0 - texColor.rgb) * v_dark.rgb + texColor.rgb * v_light.rgb;
        gl_FragColor.rgb *= mix(1.0, texColor.a, ${STRAIGHT_ALPHA_SCREEN_UNIFORM});
      }
    `;

    return new shaderApi(this.gl, vertexShader, fragmentShader);
  }

  private installStraightAlphaScreenBatchFix() {
    const originalSetBlendMode = this.batcher.setBlendMode.bind(this.batcher);
    this.batcher.setBlendMode = (source: number, destination: number) => {
      originalSetBlendMode(source, destination);
      const isScreen =
        source === this.gl.ONE && destination === this.gl.ONE_MINUS_SRC_COLOR;
      this.shader.setUniformf(STRAIGHT_ALPHA_SCREEN_UNIFORM, isScreen ? 1 : 0);
    };
  }

  private requireBone(skeleton: any, name: string) {
    const bone = skeleton.findBone(name);
    if (!bone) throw new Error(`Spine 模型缺少交互骨骼：${name}`);
    return bone;
  }

  private requireData() {
    if (!this.spineData) throw new Error("Spine 模型尚未初始化。");
    return this.spineData;
  }

  private waitForAssets(assetManager: any) {
    const startedAt = performance.now();
    return new Promise<void>((resolve, reject) => {
      const check = () => {
        if (assetManager.hasErrors()) {
          reject(
            new Error(
              `Spine 资源加载失败：${JSON.stringify(assetManager.getErrors())}`,
            ),
          );
          return;
        }
        if (assetManager.isLoadingComplete()) {
          resolve();
          return;
        }
        if (performance.now() - startedAt > 30_000) {
          reject(new Error("Spine 资源加载超过 30 秒。"));
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  }
}
