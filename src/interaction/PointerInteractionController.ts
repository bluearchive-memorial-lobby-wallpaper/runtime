import type { InteractionDefinition } from "../definition.js";
import {
  canTriggerDialogue,
  didInteractionSettingsChange,
  type WallpaperInteractionSettings,
} from "./interactionSettings.js";

export type HitRegion = "head" | "body" | "background";
export type PointerIntent = "dialogue" | "look" | "pat";

export interface PointerInteractionRenderer {
  hitTest(clientX: number, clientY: number): HitRegion;
  beginPat(): boolean;
  updatePat(deltaX: number, deltaY: number): void;
  endPat(): void;
  beginLook(): boolean;
  updateLook(clientX: number, clientY: number): void;
  endLook(): void;
  cancelInteraction(): void;
}

export interface PointerInteractionCallbacks {
  onDialogueRequested: () => boolean;
  onInteractionCompleted: (interaction: {
    intent: PointerIntent; accepted: boolean; startX: number; startY: number; endX: number; endY: number;
  }) => void;
}

export class PointerInteractionController<Settings extends WallpaperInteractionSettings = WallpaperInteractionSettings> {
  private settings?: Readonly<Settings>;
  private active?: { id: number; intent: PointerIntent; startX: number; startY: number; lastX: number; lastY: number };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly renderer: PointerInteractionRenderer,
    interaction: Pick<InteractionDefinition, "dragThresholdPixels"> & { readonly dragThresholdPixels: number },
    private readonly callbacks: PointerInteractionCallbacks,
  ) {
    this.dragThresholdPixels = interaction.dragThresholdPixels;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
    canvas.addEventListener("contextmenu", this.onContextMenu);
    // A pointerup can be lost entirely when the host suspends the CEF input
    // stream mid-gesture (Wallpaper Engine pause/resume, window blur, hidden
    // tab). The capture and active state must not leak on those paths:
    // lostpointercapture is the authoritative signal for any engine-initiated
    // release, and blur/visibilitychange cover the realistic input-loss cases
    // where no pointerup is ever delivered.
    canvas.addEventListener("lostpointercapture", this.onLostPointerCapture);
    window.addEventListener("blur", this.onWindowBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  private readonly dragThresholdPixels: number;

  applySettings(settings: Readonly<Settings>) {
    const previous = this.settings;
    this.settings = settings;
    if (!settings.interactionsEnabled || (previous && didInteractionSettingsChange(previous, settings))) this.cancelActive();
  }

  dispose() {
    this.cancelActive();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    this.canvas.removeEventListener("lostpointercapture", this.onLostPointerCapture);
    window.removeEventListener("blur", this.onWindowBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  getSnapshot() { return this.active ? { ...this.active } : null; }

  private readonly onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !this.settings?.interactionsEnabled || this.active) return;
    const region = this.renderer.hitTest(event.clientX, event.clientY);
    if (region === "background") return;
    let intent: PointerIntent = "dialogue";
    if (region === "head" && this.settings.headPatting) intent = "pat";
    if (intent === "pat" && !this.renderer.beginPat()) return;
    this.active = { id: event.pointerId, intent, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.dataset.pointerIntent = intent;
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    const active = this.active;
    if (!active || active.id !== event.pointerId) {
      this.canvas.dataset.hitRegion = this.settings?.interactionsEnabled ? this.renderer.hitTest(event.clientX, event.clientY) : "background";
      return;
    }
    const deltaX = event.clientX - active.lastX;
    const deltaY = event.clientY - active.lastY;
    active.lastX = event.clientX; active.lastY = event.clientY;
    if (active.intent === "dialogue" && this.settings?.mouseTracking) {
      const distance = Math.hypot(event.clientX - active.startX, event.clientY - active.startY);
      if (distance >= this.dragThresholdPixels && this.renderer.beginLook()) {
        active.intent = "look"; this.canvas.dataset.pointerIntent = "look";
      }
    }
    if (active.intent === "look") this.renderer.updateLook(event.clientX, event.clientY);
    else if (active.intent === "pat") this.renderer.updatePat(deltaX, deltaY);
    event.preventDefault();
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const active = this.active;
    if (!active || active.id !== event.pointerId) return;
    let accepted = true;
    if (active.intent === "look") this.renderer.endLook();
    else if (active.intent === "pat") this.renderer.endPat();
    else if (this.settings && canTriggerDialogue(this.settings)) accepted = this.callbacks.onDialogueRequested();
    else accepted = false;
    this.callbacks.onInteractionCompleted({ intent: active.intent, accepted, startX: active.startX, startY: active.startY, endX: event.clientX, endY: event.clientY });
    this.releaseActive(event.pointerId); event.preventDefault();
  };

  private readonly onPointerCancel = (event: PointerEvent) => {
    if (this.active?.id !== event.pointerId) return;
    this.renderer.cancelInteraction(); this.releaseActive(event.pointerId);
  };
  private readonly onContextMenu = (event: MouseEvent) => event.preventDefault();
  // Engine-initiated capture release (e.g. the browser retaking capture while
  // the input stream is suspended) — the authoritative cleanup signal.
  private readonly onLostPointerCapture = () => { this.cancelActive(); };
  private readonly onWindowBlur = () => { this.cancelActive(); };
  private readonly onVisibilityChange = () => { if (document.hidden) this.cancelActive(); };
  cancelActive() { if (!this.active) return; this.renderer.cancelInteraction(); this.releaseActive(this.active.id); }
  private releaseActive(pointerId: number) {
    // Clear active before releasing capture: releasePointerCapture dispatches
    // lostpointercapture synchronously, and cancelActive must see a no-op.
    this.active = undefined; delete this.canvas.dataset.pointerIntent;
    if (this.canvas.hasPointerCapture(pointerId)) this.canvas.releasePointerCapture(pointerId);
  }
}
