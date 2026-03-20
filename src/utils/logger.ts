import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const LOG_DIR = join(homedir(), ".coding-helper", "logs");
const LOG_FILE = join(LOG_DIR, "coding-helper.log");

let ready = false;
try {
  mkdirSync(LOG_DIR, { recursive: true });
  ready = true;
} catch {}

function append(level: string, mod: string, msg: string, extra?: unknown) {
  if (!ready) return;
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, mod, msg, extra });
    appendFileSync(LOG_FILE, line + "\n");
  } catch {}
}

export const logger = {
  error: (mod: string, msg: string, data?: unknown) => append("error", mod, msg, data),
  warn: (mod: string, msg: string, data?: unknown) => append("warn", mod, msg, data),
  info: (mod: string, msg: string, data?: unknown) => append("info", mod, msg, data),
  debug: (mod: string, msg: string, data?: unknown) => append("debug", mod, msg, data),
  logError(mod: string, err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    append("error", mod, msg, { stack });
  },
};
