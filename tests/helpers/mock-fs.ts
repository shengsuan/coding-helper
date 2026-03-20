/**
 * In-memory filesystem mock for testing Manager classes.
 *
 * Usage:
 *   const fs = createMockFs({ '/path/to/file.json': '{"key":"val"}' });
 *   vi.mock('fs', () => fs);
 *
 * The mock tracks all writes so tests can inspect the final state via
 * `fs._store` (the raw Map) or the helper `fs._readJson(path)`.
 */

import { vi } from 'vitest';

export interface MockFs {
  existsSync: ReturnType<typeof vi.fn>;
  readFileSync: ReturnType<typeof vi.fn>;
  writeFileSync: ReturnType<typeof vi.fn>;
  mkdirSync: ReturnType<typeof vi.fn>;
  /** Internal store — use for assertions */
  _store: Map<string, string>;
  /** Convenience: parse JSON from a written file */
  _readJson: (path: string) => unknown;
  /** Seed additional files after creation */
  _seed: (path: string, content: string) => void;
}

export function createMockFs(initial: Record<string, string> = {}): MockFs {
  const store = new Map<string, string>(Object.entries(initial));

  const existsSync = vi.fn((p: string) => store.has(p));

  const readFileSync = vi.fn((p: string, _enc?: string) => {
    if (!store.has(p)) throw new Error(`ENOENT: no such file ${p}`);
    return store.get(p)!;
  });

  const writeFileSync = vi.fn((p: string, content: string, _enc?: string) => {
    store.set(p, content);
  });

  const mkdirSync = vi.fn();

  return {
    existsSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
    _store: store,
    _readJson(path: string) {
      const raw = store.get(path);
      if (!raw) return undefined;
      return JSON.parse(raw);
    },
    _seed(path: string, content: string) {
      store.set(path, content);
    },
  };
}
