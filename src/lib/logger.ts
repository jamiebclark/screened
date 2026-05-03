const MAX_ENTRIES = 500;

export interface LogEntry {
  id: number;
  timestamp: string;
  level: "error" | "warn";
  message: string;
  stack?: string;
}

let nextId = 1;
const buffer: LogEntry[] = [];

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
    id: nextId++,
    timestamp: new Date().toISOString(),
    level,
    message,
    stack: firstError?.stack,
  };

  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

export function getRecentLogs(limit = 200): LogEntry[] {
  return buffer.slice(-limit).reverse();
}

export function clearLogs() {
  buffer.length = 0;
}

export function installConsoleCapture() {
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
