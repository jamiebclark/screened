const MAX_ENTRIES = 500;

export interface LogEntry {
  id: number;
  timestamp: string;
  level: "error" | "warn";
  message: string;
  stack?: string;
}

// Anchored to globalThis so all webpack chunks share the same buffer and
// nextId counter, even when logger.ts is evaluated in multiple bundle contexts.
type LogGlobals = {
  __logBuffer: LogEntry[];
  __logNextId: number;
  __logCaptureInstalled: boolean;
};
const g = globalThis as typeof globalThis & Partial<LogGlobals>;
if (!g.__logBuffer) g.__logBuffer = [];
if (!g.__logNextId) g.__logNextId = 1;
if (g.__logCaptureInstalled === undefined) g.__logCaptureInstalled = false;

function capture(level: "error" | "warn", args: unknown[]) {
  const firstError = args.find((a): a is Error => a instanceof Error);
  const message = args
    .map((a) => {
      if (a instanceof Error) return a.message;
      if (typeof a === "object" && a !== null) {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(" ");

  const entry: LogEntry = {
    id: g.__logNextId!++,
    timestamp: new Date().toISOString(),
    level,
    message,
    stack: firstError?.stack,
  };

  g.__logBuffer!.push(entry);
  if (g.__logBuffer!.length > MAX_ENTRIES) g.__logBuffer!.shift();
}

export function getRecentLogs(limit = 200): LogEntry[] {
  return g.__logBuffer!.slice(-limit).reverse();
}

export function clearLogs() {
  g.__logBuffer!.length = 0;
}

export function installConsoleCapture() {
  if (g.__logCaptureInstalled) return;
  g.__logCaptureInstalled = true;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    capture("error", args);
    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    capture("warn", args);
    originalWarn(...args);
  };
}
