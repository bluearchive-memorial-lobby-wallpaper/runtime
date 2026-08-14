import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: unknown): void { this.values.set(key, String(value)); }
  removeItem(key: string): void { this.values.delete(key); }
}

interface BootstrapSession {
  id: string;
  status: "running" | "clean-exit" | "interrupted";
  lines: string[];
}

interface BootstrapApi {
  sessionId: string;
  getSessions(): BootstrapSession[];
}

function launch(source: string, localStorage: MemoryStorage, sessionStorage: MemoryStorage) {
  const listeners = new Map<string, Array<(event?: any) => void>>();
  const window: Record<string, any> = {
    localStorage,
    sessionStorage,
    location: { href: "file:///wallpaper/index.html" },
    addEventListener(type: string, listener: (event?: any) => void) {
      const registered = listeners.get(type) ?? [];
      registered.push(listener);
      listeners.set(type, registered);
    },
  };
  window.window = window;
  vm.runInNewContext(source, { window }, { filename: "logging-bootstrap.js" });
  return { api: window.__wallpaperLogBootstrap as BootstrapApi, listeners };
}

test("logging bootstrap preserves interrupted sessions and records clean exits", async () => {
  const source = await readFile(new URL("../assets/logging-bootstrap.js", import.meta.url), "utf8");
  assert.equal(source.includes("hare"), false, "runtime asset must remain character agnostic");
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const crashed = launch(source, localStorage, sessionStorage);
  const crashedId = crashed.api.sessionId;
  for (const listener of crashed.listeners.get("error") ?? []) {
    listener({ message: "early failure", filename: "runtime.js", lineno: 7, colno: 3, error: new Error("boom") });
  }

  const recovered = launch(source, localStorage, sessionStorage);
  const previous = recovered.api.getSessions().find((session) => session.id === crashedId);
  assert.equal(previous?.status, "interrupted");
  assert(previous?.lines.some((line) => line.includes("early failure")));
  for (const listener of recovered.listeners.get("beforeunload") ?? []) listener();
  const current = recovered.api.getSessions().find((session) => session.id === recovered.api.sessionId);
  assert.equal(current?.status, "clean-exit");
});
