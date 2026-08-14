interface ScrollbarBinding {
  viewport: HTMLElement;
  track: HTMLElement;
  thumb: HTMLElement;
  axis: "vertical" | "horizontal";
  fixedToViewport: boolean;
  isVisible: () => boolean;
}

type ActiveDrag =
  | {
      kind: "range";
      pointerId: number;
      input: HTMLInputElement;
      left: number;
      width: number;
    }
  | {
      kind: "scrollbar";
      pointerId: number;
      binding: ScrollbarBinding;
      grabOffset: number;
    };

export class DebugPanelPointerController {
  private readonly panel: HTMLElement;
  private readonly scrollbars: readonly ScrollbarBinding[];
  private readonly trackPointerHandlers = new Map<HTMLElement, (event: PointerEvent) => void>();
  private readonly resizeObserver: ResizeObserver;
  private active?: ActiveDrag;
  private refreshRequest = 0;

  constructor(options: {
    panel: HTMLElement;
    panelScrollbar: HTMLElement;
    panelScrollbarThumb: HTMLElement;
    logViewer: HTMLElement;
    logViewport: HTMLElement;
    logScrollbar: HTMLElement;
    logScrollbarThumb: HTMLElement;
    logHorizontalScrollbar: HTMLElement;
    logHorizontalScrollbarThumb: HTMLElement;
  }) {
    this.panel = options.panel;
    this.scrollbars = [
      {
        viewport: options.panel,
        track: options.panelScrollbar,
        thumb: options.panelScrollbarThumb,
        axis: "vertical",
        fixedToViewport: true,
        isVisible: () => options.panel.classList.contains("status-panel--visible"),
      },
      {
        viewport: options.logViewport,
        track: options.logScrollbar,
        thumb: options.logScrollbarThumb,
        axis: "vertical",
        fixedToViewport: false,
        isVisible: () => !options.logViewer.hidden,
      },
      {
        viewport: options.logViewport,
        track: options.logHorizontalScrollbar,
        thumb: options.logHorizontalScrollbarThumb,
        axis: "horizontal",
        fixedToViewport: false,
        isVisible: () => !options.logViewer.hidden,
      },
    ];

    this.panel.addEventListener("pointerdown", this.onPanelPointerDown, true);
    this.panel.addEventListener("click", this.scheduleRefresh);
    this.panel.addEventListener("change", this.scheduleRefresh);
    window.addEventListener("pointermove", this.onPointerMove, true);
    window.addEventListener("pointerup", this.onPointerUp, true);
    window.addEventListener("pointercancel", this.onPointerUp, true);
    window.addEventListener("resize", this.scheduleRefresh);

    for (const binding of this.scrollbars) {
      binding.viewport.addEventListener("scroll", this.scheduleRefresh);
      const handler = (event: PointerEvent) => this.beginScrollbarDrag(event, binding);
      this.trackPointerHandlers.set(binding.track, handler);
      binding.track.addEventListener("pointerdown", handler);
    }

    this.resizeObserver = new ResizeObserver(this.scheduleRefresh);
    this.resizeObserver.observe(this.panel);
    this.resizeObserver.observe(options.logViewer);
    this.resizeObserver.observe(options.logViewport);
    this.refresh();
  }

  refresh() {
    cancelAnimationFrame(this.refreshRequest);
    this.refreshRequest = 0;
    for (const binding of this.scrollbars) this.refreshScrollbar(binding);
  }

  requestRefresh() {
    this.scheduleRefresh();
  }

  dispose() {
    cancelAnimationFrame(this.refreshRequest);
    this.resizeObserver.disconnect();
    this.panel.removeEventListener("pointerdown", this.onPanelPointerDown, true);
    this.panel.removeEventListener("click", this.scheduleRefresh);
    this.panel.removeEventListener("change", this.scheduleRefresh);
    window.removeEventListener("pointermove", this.onPointerMove, true);
    window.removeEventListener("pointerup", this.onPointerUp, true);
    window.removeEventListener("pointercancel", this.onPointerUp, true);
    window.removeEventListener("resize", this.scheduleRefresh);
    for (const binding of this.scrollbars) {
      binding.viewport.removeEventListener("scroll", this.scheduleRefresh);
      const handler = this.trackPointerHandlers.get(binding.track);
      if (handler) binding.track.removeEventListener("pointerdown", handler);
    }
    this.trackPointerHandlers.clear();
    this.finishDrag();
  }

  private readonly scheduleRefresh = () => {
    if (this.refreshRequest) return;
    this.refreshRequest = requestAnimationFrame(() => this.refresh());
  };

  private readonly onPanelPointerDown = (event: PointerEvent) => {
    const input =
      event.target instanceof HTMLInputElement && event.target.type === "range"
        ? event.target
        : null;
    if (!input || input.disabled || event.button !== 0 || this.active) return;

    const rect = input.getBoundingClientRect();
    if (rect.width <= 0) return;
    this.active = {
      kind: "range",
      pointerId: event.pointerId,
      input,
      left: rect.left,
      width: rect.width,
    };
    this.panel.dataset.pointerDrag = "range";
    this.updateRangeValue(this.active, event.clientX);
    event.preventDefault();
    event.stopPropagation();
  };

  private beginScrollbarDrag(event: PointerEvent, binding: ScrollbarBinding) {
    if (event.button !== 0 || this.active || binding.track.hidden) return;
    const thumbRect = binding.thumb.getBoundingClientRect();
    const horizontal = binding.axis === "horizontal";
    const pointerCoordinate = horizontal ? event.clientX : event.clientY;
    const thumbStart = horizontal ? thumbRect.left : thumbRect.top;
    const thumbLength = horizontal ? thumbRect.width : thumbRect.height;
    const pressedThumb =
      event.target === binding.thumb || binding.thumb.contains(event.target as Node);
    this.active = {
      kind: "scrollbar",
      pointerId: event.pointerId,
      binding,
      grabOffset: pressedThumb
        ? pointerCoordinate - thumbStart
        : thumbLength / 2,
    };
    this.panel.dataset.pointerDrag = "scrollbar";
    if (!pressedThumb) this.updateScrollbarValue(this.active, pointerCoordinate);
    event.preventDefault();
    event.stopPropagation();
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    const active = this.active;
    if (!active || event.pointerId !== active.pointerId) return;
    if (active.kind === "range") this.updateRangeValue(active, event.clientX);
    else {
      const pointerCoordinate = active.binding.axis === "horizontal"
        ? event.clientX
        : event.clientY;
      this.updateScrollbarValue(active, pointerCoordinate);
    }
    event.preventDefault();
    event.stopPropagation();
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const active = this.active;
    if (!active || event.pointerId !== active.pointerId) return;
    if (active.kind === "range") {
      this.updateRangeValue(active, event.clientX);
      active.input.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      const pointerCoordinate = active.binding.axis === "horizontal"
        ? event.clientX
        : event.clientY;
      this.updateScrollbarValue(active, pointerCoordinate);
    }
    this.finishDrag();
    event.preventDefault();
    event.stopPropagation();
  };

  private updateRangeValue(
    active: Extract<ActiveDrag, { kind: "range" }>,
    clientX: number,
  ) {
    const min = Number(active.input.min || 0);
    const max = Number(active.input.max || 100);
    const step = Number(active.input.step || 1);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return;

    const ratio = Math.min(Math.max((clientX - active.left) / active.width, 0), 1);
    const rawValue = min + ratio * (max - min);
    const steppedValue = Number.isFinite(step) && step > 0
      ? min + Math.round((rawValue - min) / step) * step
      : rawValue;
    const precision = Number.isFinite(step) && step > 0
      ? Math.min(8, Math.max(0, (String(step).split(".")[1] ?? "").length))
      : 6;
    const value = Math.min(Math.max(steppedValue, min), max).toFixed(precision);
    if (active.input.value === value) return;
    active.input.value = value;
    active.input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private updateScrollbarValue(
    active: Extract<ActiveDrag, { kind: "scrollbar" }>,
    pointerCoordinate: number,
  ) {
    const { binding, grabOffset } = active;
    const trackRect = binding.track.getBoundingClientRect();
    const thumbRect = binding.thumb.getBoundingClientRect();
    const horizontal = binding.axis === "horizontal";
    const trackStart = horizontal ? trackRect.left : trackRect.top;
    const trackLength = horizontal ? trackRect.width : trackRect.height;
    const thumbLength = horizontal ? thumbRect.width : thumbRect.height;
    const availableTrack = Math.max(trackLength - thumbLength, 0);
    const maxScroll = horizontal
      ? Math.max(binding.viewport.scrollWidth - binding.viewport.clientWidth, 0)
      : Math.max(binding.viewport.scrollHeight - binding.viewport.clientHeight, 0);
    if (availableTrack <= 0 || maxScroll <= 0) return;
    const thumbPosition = Math.min(
      Math.max(pointerCoordinate - trackStart - grabOffset, 0),
      availableTrack,
    );
    const scrollPosition = (thumbPosition / availableTrack) * maxScroll;
    if (horizontal) binding.viewport.scrollLeft = scrollPosition;
    else binding.viewport.scrollTop = scrollPosition;
    this.refreshScrollbar(binding);
  }

  private refreshScrollbar(binding: ScrollbarBinding) {
    const viewportRect = binding.viewport.getBoundingClientRect();
    const horizontal = binding.axis === "horizontal";
    const viewportLength = horizontal
      ? binding.viewport.clientWidth
      : binding.viewport.clientHeight;
    const scrollLength = horizontal
      ? binding.viewport.scrollWidth
      : binding.viewport.scrollHeight;
    const maxScroll = Math.max(scrollLength - viewportLength, 0);
    const viewportVisible = viewportRect.width > 0 && viewportRect.height > 0;
    binding.track.hidden = !binding.isVisible() || !viewportVisible || maxScroll <= 1;
    if (binding.track.hidden) return;

    if (binding.fixedToViewport) {
      binding.track.style.left = `${viewportRect.right - 12}px`;
      binding.track.style.top = `${viewportRect.top + 4}px`;
      binding.track.style.height = `${Math.max(viewportRect.height - 8, 0)}px`;
    }

    const trackRect = binding.track.getBoundingClientRect();
    const trackLength = horizontal ? trackRect.width : trackRect.height;
    if (trackLength <= 0) return;
    const thumbLength = Math.max(
      28,
      Math.min(
        trackLength,
        trackLength * (viewportLength / scrollLength),
      ),
    );
    const availableTrack = Math.max(trackLength - thumbLength, 0);
    const scrollPosition = horizontal
      ? binding.viewport.scrollLeft
      : binding.viewport.scrollTop;
    const thumbPosition = maxScroll > 0
      ? availableTrack * (scrollPosition / maxScroll)
      : 0;
    if (horizontal) {
      binding.thumb.style.width = `${thumbLength}px`;
      binding.thumb.style.transform = `translateX(${thumbPosition}px)`;
    } else {
      binding.thumb.style.height = `${thumbLength}px`;
      binding.thumb.style.transform = `translateY(${thumbPosition}px)`;
    }
  }

  private finishDrag() {
    this.active = undefined;
    delete this.panel.dataset.pointerDrag;
    this.scheduleRefresh();
  }
}
