import type { StoredLogSession } from "../logging/WallpaperLogger.js";

type LogViewerLocale = "zh-cn" | "en";

const VIEWER_TEXT = {
  "zh-cn": {
    title: "壁纸日志",
    session: "日志会话",
    close: "关闭",
    copyAll: "复制当前全部",
    copied: "已复制",
    copyFailed: "复制失败",
    previousSession: "上一份日志",
    nextSession: "下一份日志",
    content: "日志内容",
    current: "当前运行",
    cleanExit: "正常结束",
    interrupted: "异常中断",
    possiblyInterrupted: "未正常结束",
    truncated: "较早的日志已因容量限制被清理。",
  },
  en: {
    title: "Wallpaper logs",
    session: "Log session",
    close: "Close",
    copyAll: "Copy current log",
    copied: "Copied",
    copyFailed: "Copy failed",
    previousSession: "Previous log",
    nextSession: "Next log",
    content: "Log content",
    current: "Current",
    cleanExit: "Clean exit",
    interrupted: "Interrupted",
    possiblyInterrupted: "Did not exit cleanly",
    truncated: "Older entries were removed because of the storage limit.",
  },
} as const;

interface LogSessionSnapshot {
  currentSessionId: string;
  sessions: StoredLogSession[];
}

export class LogViewerController {
  private readonly viewer: HTMLElement;
  private readonly title: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly copyButton: HTMLButtonElement;
  private readonly sessionLabel: HTMLElement;
  private readonly previousSessionButton: HTMLButtonElement;
  private readonly nextSessionButton: HTMLButtonElement;
  private readonly notice: HTMLParagraphElement;
  private readonly content: HTMLPreElement;
  private readonly getSnapshot: () => LogSessionSnapshot;
  private readonly onLayoutChange: () => void;
  private readonly onInteraction: (
    action: "close" | "session-change" | "copy",
    details?: Record<string, unknown>,
  ) => void;
  private readonly onVisibilityChange: (visible: boolean) => void;
  private sessions: StoredLogSession[] = [];
  private currentSessionId = "";
  private locale: LogViewerLocale = "zh-cn";
  private contentRenderTimer = 0;
  private copyFeedbackTimer = 0;
  private selectedSessionIndex = 0;

  constructor(options: {
    viewer: HTMLElement;
    title: HTMLElement;
    closeButton: HTMLButtonElement;
    copyButton: HTMLButtonElement;
    sessionLabel: HTMLElement;
    previousSessionButton: HTMLButtonElement;
    nextSessionButton: HTMLButtonElement;
    notice: HTMLParagraphElement;
    content: HTMLPreElement;
    getSnapshot: () => LogSessionSnapshot;
    onLayoutChange: () => void;
    onInteraction: (
      action: "close" | "session-change" | "copy",
      details?: Record<string, unknown>,
    ) => void;
    onVisibilityChange: (visible: boolean) => void;
  }) {
    this.viewer = options.viewer;
    this.title = options.title;
    this.closeButton = options.closeButton;
    this.copyButton = options.copyButton;
    this.sessionLabel = options.sessionLabel;
    this.previousSessionButton = options.previousSessionButton;
    this.nextSessionButton = options.nextSessionButton;
    this.notice = options.notice;
    this.content = options.content;
    this.getSnapshot = options.getSnapshot;
    this.onLayoutChange = options.onLayoutChange;
    this.onInteraction = options.onInteraction;
    this.onVisibilityChange = options.onVisibilityChange;
    this.closeButton.addEventListener("click", this.close);
    this.copyButton.addEventListener("click", this.copyCurrentSession);
    this.previousSessionButton.addEventListener("click", this.showPreviousSession);
    this.nextSessionButton.addEventListener("click", this.showNextSession);
  }

  open(locale: LogViewerLocale) {
    this.locale = locale;
    const snapshot = this.getSnapshot();
    this.sessions = snapshot.sessions;
    this.currentSessionId = snapshot.currentSessionId;
    this.renderText();
    this.sessionLabel.textContent = VIEWER_TEXT[this.locale].session;
    this.content.textContent = "";
    this.notice.hidden = true;
    this.viewer.hidden = false;
    this.onVisibilityChange(true);
    this.onLayoutChange();
    window.clearTimeout(this.contentRenderTimer);
    this.contentRenderTimer = window.setTimeout(() => {
      this.renderSessions();
      this.showSelectedSession();
      this.onLayoutChange();
    }, 100);
  }

  dispose() {
    window.clearTimeout(this.contentRenderTimer);
    window.clearTimeout(this.copyFeedbackTimer);
    this.closeButton.removeEventListener("click", this.close);
    this.copyButton.removeEventListener("click", this.copyCurrentSession);
    this.previousSessionButton.removeEventListener("click", this.showPreviousSession);
    this.nextSessionButton.removeEventListener("click", this.showNextSession);
  }

  private renderText() {
    const text = VIEWER_TEXT[this.locale];
    this.viewer.setAttribute("aria-label", text.title);
    this.title.textContent = text.title;
    this.closeButton.textContent = "×";
    this.closeButton.setAttribute("aria-label", text.close);
    this.closeButton.title = text.close;
    this.copyButton.textContent = text.copyAll;
    this.previousSessionButton.setAttribute("aria-label", text.previousSession);
    this.nextSessionButton.setAttribute("aria-label", text.nextSession);
    this.content.setAttribute("aria-label", text.content);
  }

  get isOpen() {
    return !this.viewer.hidden;
  }

  toggle(locale: LogViewerLocale) {
    if (this.isOpen) this.close();
    else this.open(locale);
  }

  setLocale(locale: LogViewerLocale) {
    this.locale = locale;
    if (!this.isOpen) return;
    this.renderText();
    this.showSelectedSession();
  }

  private renderSessions() {
    const currentIndex = this.sessions.findIndex(
      (session) => session.id === this.currentSessionId,
    );
    this.selectedSessionIndex = currentIndex >= 0 ? currentIndex : 0;
    const multipleSessions = this.sessions.length > 1;
    this.previousSessionButton.disabled = !multipleSessions;
    this.nextSessionButton.disabled = !multipleSessions;
  }

  private readonly showSelectedSession = () => {
    const selected = this.sessions[this.selectedSessionIndex];
    if (!selected) {
      this.content.textContent = "";
      this.sessionLabel.textContent = VIEWER_TEXT[this.locale].session;
      this.notice.hidden = true;
      this.onLayoutChange();
      return;
    }
    const text = VIEWER_TEXT[this.locale];
    const status =
      selected.id === this.currentSessionId
        ? text.current
        : selected.status === "clean-exit"
          ? text.cleanExit
          : selected.status === "interrupted"
            ? text.interrupted
            : text.possiblyInterrupted;
    this.sessionLabel.textContent = `${selected.fileName} · ${status}`;
    this.content.textContent = `${selected.lines.join("\n")}\n`;
    this.content.scrollTop = 0;
    this.content.scrollLeft = 0;
    this.notice.textContent = selected.truncated
      ? text.truncated
      : "";
    this.notice.hidden = !selected.truncated;
    this.onLayoutChange();
  };

  private changeSession(offset: number) {
    if (this.sessions.length <= 1) return;
    this.selectedSessionIndex =
      (this.selectedSessionIndex + offset + this.sessions.length) %
      this.sessions.length;
    this.showSelectedSession();
    this.onInteraction("session-change", {
      sessionId: this.sessions[this.selectedSessionIndex]?.id,
    });
  }

  private readonly showPreviousSession = () => this.changeSession(-1);

  private readonly showNextSession = () => this.changeSession(1);

  private readonly copyCurrentSession = async () => {
    const selected = this.sessions[this.selectedSessionIndex];
    const value = this.content.textContent ?? "";
    let copied = value.length > 0 && this.copyUsingSelection();
    if (!copied && value.length > 0 && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        copied = true;
      } catch {
        copied = false;
      }
    }
    const text = VIEWER_TEXT[this.locale];
    window.clearTimeout(this.copyFeedbackTimer);
    this.copyButton.textContent = copied ? text.copied : text.copyFailed;
    this.copyFeedbackTimer = window.setTimeout(() => {
      this.copyButton.textContent = VIEWER_TEXT[this.locale].copyAll;
    }, 1400);
    this.onInteraction("copy", { success: copied, sessionId: selected?.id });
  };

  private copyUsingSelection() {
    const selection = window.getSelection();
    if (!selection) return false;
    const savedRanges = Array.from({ length: selection.rangeCount }, (_, index) =>
      selection.getRangeAt(index).cloneRange(),
    );
    const range = document.createRange();
    range.selectNodeContents(this.content);
    selection.removeAllRanges();
    selection.addRange(range);
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    selection.removeAllRanges();
    for (const savedRange of savedRanges) selection.addRange(savedRange);
    return copied;
  }

  private readonly close = () => {
    window.clearTimeout(this.contentRenderTimer);
    window.clearTimeout(this.copyFeedbackTimer);
    this.viewer.hidden = true;
    this.onLayoutChange();
    this.onVisibilityChange(false);
    this.onInteraction("close");
  };
}
