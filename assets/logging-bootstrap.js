(function initializeWallpaperLoggingBootstrap() {
  "use strict";

  if (window.__wallpaperLogBootstrap) return;

  var STORAGE_PREFIX = "memorial-lobby-wallpaper-log:v1:";
  var INDEX_KEY = STORAGE_PREFIX + "index";
  var SESSION_KEY_PREFIX = STORAGE_PREFIX + "session:";
  var ACTIVE_SESSION_KEY = STORAGE_PREFIX + "active-session";
  var MAX_SESSIONS = 10;
  var MAX_SESSION_CHARACTERS = 160000;
  var memoryStorage = Object.create(null);

  function getStorageValue(key) {
    if (Object.prototype.hasOwnProperty.call(memoryStorage, key)) {
      return memoryStorage[key];
    }
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function setStorageValue(key, value) {
    try {
      window.localStorage.setItem(key, value);
      delete memoryStorage[key];
      return true;
    } catch (_error) {
      memoryStorage[key] = value;
      return false;
    }
  }

  function removeStorageValue(key) {
    delete memoryStorage[key];
    try {
      window.localStorage.removeItem(key);
    } catch (_error) {}
  }

  function parseJson(value, fallback) {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  function pad(value, width) {
    return String(value).padStart(width || 2, "0");
  }

  function createSessionIdentity(now) {
    var date =
      now.getFullYear() +
      "-" +
      pad(now.getMonth() + 1) +
      "-" +
      pad(now.getDate());
    var time =
      pad(now.getHours()) +
      "-" +
      pad(now.getMinutes()) +
      "-" +
      pad(now.getSeconds()) +
      "-" +
      pad(now.getMilliseconds(), 3);
    var random = Math.random().toString(36).slice(2).padEnd(6, "0").slice(0, 6);
    return {
      id: date + "_" + time + "_" + random,
      fileName: date + "_" + time + "_" + random + ".log",
    };
  }

  function safeStringify(value) {
    var seen = [];
    try {
      return JSON.stringify(value, function replaceCircular(_key, nestedValue) {
        if (typeof nestedValue === "bigint") return String(nestedValue);
        if (typeof nestedValue !== "object" || nestedValue === null) {
          return nestedValue;
        }
        if (seen.indexOf(nestedValue) !== -1) return "[Circular]";
        seen.push(nestedValue);
        return nestedValue;
      });
    } catch (_error) {
      return JSON.stringify(String(value));
    }
  }

  function normalizeError(error) {
    if (!error || typeof error !== "object") return error;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  function formatLine(level, category, message, details) {
    var suffix = details === undefined ? "" : " " + safeStringify(details);
    return (
      "[" +
      new Date().toISOString() +
      "] [" +
      level +
      "] [" +
      category +
      "] " +
      message +
      suffix
    );
  }

  function readIndex() {
    var value = parseJson(getStorageValue(INDEX_KEY), []);
    return Array.isArray(value)
      ? value.filter(function isSessionId(item) {
          return typeof item === "string";
        })
      : [];
  }

  function writeIndex(index) {
    setStorageValue(INDEX_KEY, JSON.stringify(index));
  }

  function readSession(id) {
    var value = parseJson(getStorageValue(SESSION_KEY_PREFIX + id), null);
    return value && Array.isArray(value.lines) ? value : null;
  }

  function removeOldSessions(index) {
    while (index.length > MAX_SESSIONS) {
      var removedId = index.shift();
      if (removedId) removeStorageValue(SESSION_KEY_PREFIX + removedId);
    }
  }

  function shrinkSession(session) {
    var serialized = JSON.stringify(session);
    if (serialized.length <= MAX_SESSION_CHARACTERS) return serialized;
    session.truncated = true;
    while (session.lines.length > 1 && serialized.length > MAX_SESSION_CHARACTERS) {
      session.lines.splice(0, Math.max(Math.floor(session.lines.length / 8), 1));
      serialized = JSON.stringify(session);
    }
    return serialized;
  }

  function persistSession(session) {
    session.updatedAt = new Date().toISOString();
    var serialized = shrinkSession(session);
    if (setStorageValue(SESSION_KEY_PREFIX + session.id, serialized)) return;

    var index = readIndex();
    while (index.length > 1) {
      var oldestId = index[0];
      if (oldestId === session.id) break;
      index.shift();
      removeStorageValue(SESSION_KEY_PREFIX + oldestId);
      writeIndex(index);
      if (setStorageValue(SESSION_KEY_PREFIX + session.id, serialized)) return;
    }
  }

  var now = new Date();
  var identity = createSessionIdentity(now);
  var session = {
    version: 1,
    id: identity.id,
    fileName: identity.fileName,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    endedAt: null,
    status: "running",
    truncated: false,
    lines: [],
  };

  try {
    var previousActiveId = window.sessionStorage.getItem(ACTIVE_SESSION_KEY);
    if (previousActiveId && previousActiveId !== session.id) {
      var previousSession = readSession(previousActiveId);
      if (previousSession && previousSession.status === "running") {
        previousSession.status = "interrupted";
        previousSession.endedAt = now.toISOString();
        persistSession(previousSession);
      }
    }
    window.sessionStorage.setItem(ACTIVE_SESSION_KEY, session.id);
  } catch (_error) {
    // Session storage is an optimization; persistent logs do not depend on it.
  }

  var index = readIndex().filter(function removeDuplicateId(id) {
    return id !== session.id;
  });
  index.push(session.id);
  removeOldSessions(index);
  writeIndex(index);

  function append(line) {
    session.lines.push(String(line));
    persistSession(session);
  }

  function getSessions() {
    return readIndex()
      .slice()
      .reverse()
      .map(readSession)
      .filter(Boolean);
  }

  function markCleanExit() {
    if (session.status !== "running") return;
    session.status = "clean-exit";
    session.endedAt = new Date().toISOString();
    persistSession(session);
    try {
      if (window.sessionStorage.getItem(ACTIVE_SESSION_KEY) === session.id) {
        window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    } catch (_error) {
      // The log has already been persisted even when session storage is unavailable.
    }
  }

  window.__wallpaperLogBootstrap = {
    sessionId: session.id,
    sessionFileName: session.fileName,
    handlesGlobalErrors: true,
    append: append,
    getSessions: getSessions,
    markCleanExit: markCleanExit,
  };

  append(formatLine("INFO", "lifecycle", "logging bootstrap initialized", {
    sessionFile: session.fileName,
    url: window.location.href,
  }));

  window.addEventListener("error", function captureEarlyError(event) {
    append(
      formatLine("ERROR", "error", "uncaught runtime error", {
        message: event.message,
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        error: normalizeError(event.error),
      }),
    );
  });

  window.addEventListener("unhandledrejection", function captureEarlyRejection(event) {
    append(
      formatLine(
        "ERROR",
        "error",
        "unhandled promise rejection",
        normalizeError(event.reason),
      ),
    );
  });

  window.addEventListener("beforeunload", markCleanExit);
})();
