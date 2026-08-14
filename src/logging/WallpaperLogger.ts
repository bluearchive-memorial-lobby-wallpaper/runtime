export type LogCategory =
  | "lifecycle"
  | "error"
  | "animation"
  | "interaction"
  | "configuration";

type LogLevel = "INFO" | "WARN" | "ERROR";
interface LogRecord {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: unknown;
}

export interface StoredLogSession {
  id: string;
  fileName: string;
  startedAt: string;
  updatedAt: string;
  endedAt: string | null;
  status: "running" | "clean-exit" | "interrupted";
  truncated: boolean;
  lines: string[];
}

const MAX_MEMORY_LINES = 4000;

export interface WallpaperLogBootstrap {
  sessionId: string;
  sessionFileName: string;
  handlesGlobalErrors: boolean;
  append: (line: string) => void;
  getSessions: () => StoredLogSession[];
}

export interface WallpaperLoggerOptions {
  readonly bootstrap?: WallpaperLogBootstrap;
  readonly developmentEndpoint?: string;
}

function pad(value: number, width = 2) {
  return String(value).padStart(width, "0");
}

function createFallbackSessionIdentity(now: Date) {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}`;
  const random = Math.random().toString(36).slice(2).padEnd(6, "0").slice(0, 6);
  const id = `${date}_${time}_${random}`;
  return { id, fileName: `${id}.log`, startedAt: now.toISOString() };
}

function normalizeDetails(details: unknown): unknown {
  if (details instanceof Error) {
    return {
      name: details.name,
      message: details.message,
      stack: details.stack,
    };
  }
  return details;
}

function safeStringify(value: unknown) {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, nestedValue: unknown) => {
      if (typeof nestedValue === "bigint") return String(nestedValue);
      if (typeof nestedValue !== "object" || nestedValue === null) return nestedValue;
      if (seen.has(nestedValue)) return "[Circular]";
      seen.add(nestedValue);
      return nestedValue;
    });
  } catch {
    return JSON.stringify(String(value));
  }
}

function formatRecord(record: LogRecord) {
  const details =
    record.details === undefined
      ? ""
      : ` ${safeStringify(normalizeDetails(record.details))}`;
  return `[${record.timestamp}] [${record.level}] [${record.category}] ${record.message}${details}`;
}

export class WallpaperLogger {
  readonly sessionFileName: string;

  private readonly sessionId: string;
  private readonly fallbackSessionStartedAt: string;
  private readonly lines: string[] = [];
  private backend: "probing" | "http" | "persistent" = "probing";
  private writeChain = Promise.resolve();
  private globalHandlersInstalled = false;
  private readonly bootstrap?: WallpaperLogBootstrap;
  private readonly developmentEndpoint: string;

  constructor(options: WallpaperLoggerOptions = {}) {
    const fallback = createFallbackSessionIdentity(new Date());
    const bootstrap = options.bootstrap;
    this.bootstrap = bootstrap;
    this.developmentEndpoint = options.developmentEndpoint ?? "/__wallpaper-log";
    this.sessionId = bootstrap?.sessionId ?? fallback.id;
    this.sessionFileName = bootstrap?.sessionFileName ?? fallback.fileName;
    this.fallbackSessionStartedAt = fallback.startedAt;
    const currentSession = bootstrap
      ?.getSessions()
      .find((session) => session.id === this.sessionId);
    if (currentSession) this.lines.push(...currentSession.lines);
  }

  start() {
    if (!this.bootstrap?.handlesGlobalErrors) {
      this.installGlobalErrorHandlers();
    }
    this.info("lifecycle", "wallpaper application load started", {
      sessionFile: this.sessionFileName,
      userAgent: navigator.userAgent,
    });
    void this.resolveBackend();
  }

  info(category: LogCategory, message: string, details?: unknown) {
    this.append("INFO", category, message, details);
  }

  warn(category: LogCategory, message: string, details?: unknown) {
    this.append("WARN", category, message, details);
  }

  error(category: LogCategory, message: string, details?: unknown) {
    this.append("ERROR", category, message, details);
  }

  getSessionSnapshot() {
    return {
      currentSessionId: this.sessionId,
      sessions: this.getStoredSessions().map((session) => ({
        ...session,
        lines: [...session.lines],
      })),
    };
  }

  private append(
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: unknown,
  ) {
    const line = formatRecord({
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
    });
    this.lines.push(line);
    if (this.lines.length > MAX_MEMORY_LINES) this.lines.shift();
    this.bootstrap?.append(line);
    if (this.backend === "http") this.queueHttpAppend(line);
  }

  private getStoredSessions(): StoredLogSession[] {
    const sessions = this.bootstrap?.getSessions() ?? [];
    if (sessions.length > 0) return sessions;
    return [
      {
        id: this.sessionId,
        fileName: this.sessionFileName,
        startedAt: this.fallbackSessionStartedAt,
        updatedAt: new Date().toISOString(),
        endedAt: null,
        status: "running",
        truncated: this.lines.length >= MAX_MEMORY_LINES,
        lines: [...this.lines],
      },
    ];
  }

  private async resolveBackend() {
    if (location.protocol === "http:" || location.protocol === "https:") {
      try {
        const initialLines = [...this.lines];
        const response = await fetch(`${this.developmentEndpoint}/append`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionFile: this.sessionFileName,
            lines: initialLines,
          }),
        });
        if (response.ok) {
          this.backend = "http";
          for (const line of this.lines.slice(initialLines.length)) {
            this.queueHttpAppend(line);
          }
          return;
        }
      } catch {
        // Static servers do not provide the optional development log bridge.
      }
    }
    this.backend = "persistent";
  }

  private queueHttpAppend(line: string) {
    this.writeChain = this.writeChain
      .then(async () => {
        const response = await fetch(`${this.developmentEndpoint}/append`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionFile: this.sessionFileName, lines: [line] }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      })
      .catch((error) => {
        this.backend = "persistent";
        console.warn("开发日志文件桥接不可用，日志仍保存在壁纸持久存储中。", error);
      });
  }

  private installGlobalErrorHandlers() {
    if (this.globalHandlersInstalled) return;
    this.globalHandlersInstalled = true;
    window.addEventListener("error", (event) => {
      this.error("error", "uncaught runtime error", {
        message: event.message,
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        error: normalizeDetails(event.error),
      });
    });
    window.addEventListener("unhandledrejection", (event) => {
      this.error("error", "unhandled promise rejection", normalizeDetails(event.reason));
    });
  }
}
