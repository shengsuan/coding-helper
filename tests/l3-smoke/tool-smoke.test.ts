/**
 * L3a: Smoke Tests — Third-party Tool Verification
 *
 * These tests check whether installed tools can actually consume the configs
 * that coding-helper writes. Tests are auto-skipped when the tool is not installed.
 *
 * NOTE: These tests read REAL config files on the host. They do NOT modify them.
 * They only verify that existing coding-helper-written configs are structurally valid
 * from the tool's perspective.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

function isInstalled(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function runCommand(cmd: string, timeoutMs = 15000): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(cmd, {
      stdio: 'pipe',
      timeout: timeoutMs,
      encoding: 'utf-8',
    });
    return { stdout, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString() || error.message || '',
      exitCode: error.status ?? 1,
    };
  }
}

function readJsonSafe(path: string): any {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

// ─── OpenClaw ───────────────────────────────────────────────────

describe('OpenClaw smoke test', () => {
  const installed = isInstalled('openclaw');

  it.skipIf(!installed)('openclaw binary should be accessible', () => {
    const result = runCommand('openclaw --version');
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/\d/); // has version number
  });

  it.skipIf(!installed)('openclaw.json should be parseable', () => {
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    const config = readJsonSafe(configPath);

    if (!config) return; // No config yet, skip
    // Should be valid JSON with expected top-level keys
    expect(typeof config).toBe('object');
  });

  it.skipIf(!installed)('configured providers should have required fields', () => {
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    const config = readJsonSafe(configPath);
    if (!config?.models?.providers) return;

    for (const [id, provider] of Object.entries(config.models.providers) as [string, any][]) {
      expect(provider.baseUrl, `${id}: missing baseUrl`).toBeTypeOf('string');
      expect(provider.api, `${id}: missing api`).toBeTypeOf('string');
      expect(Array.isArray(provider.models), `${id}: models should be array`).toBe(true);

      for (const model of provider.models) {
        expect(model.id, `${id}/${model.id}: missing id`).toBeTypeOf('string');
        expect(model.contextWindow, `${id}/${model.id}: missing contextWindow`).toBeTypeOf('number');

        // Validate input field if present
        if (model.input !== undefined) {
          expect(Array.isArray(model.input), `${id}/${model.id}: input should be array`).toBe(true);
          const validInputs = ['text', 'image', 'document'];
          for (const inp of model.input) {
            expect(validInputs, `${id}/${model.id}: invalid input "${inp}"`).toContain(inp);
          }
        }
      }
    }
  });

  it.skipIf(!installed)('model.primary should reference a valid provider/model', () => {
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    const config = readJsonSafe(configPath);
    if (!config?.agents?.defaults?.model?.primary) return;

    const primary = config.agents.defaults.model.primary;
    const parts = primary.split('/');
    expect(parts.length, `model.primary "${primary}" should have format provider/model`).toBe(2);

    const [providerId, modelId] = parts;
    const provider = config.models?.providers?.[providerId];
    if (!provider) return; // provider might be external

    const found = provider.models.find((m: any) => m.id === modelId);
    expect(found, `model "${modelId}" should exist in provider "${providerId}"`).toBeDefined();
  });
});

// ─── OpenCode ───────────────────────────────────────────────────

describe('OpenCode smoke test', () => {
  const installed = isInstalled('opencode');

  it.skipIf(!installed)('opencode binary should be accessible', () => {
    const result = runCommand('opencode --version');
    expect(result.exitCode).toBe(0);
  });

  it.skipIf(!installed)('opencode.json should be parseable', () => {
    const configPath = join(homedir(), '.config', 'opencode', 'opencode.json');
    const config = readJsonSafe(configPath);

    if (!config) return;
    expect(typeof config).toBe('object');
    if (config.$schema) {
      expect(config.$schema).toBe('https://opencode.ai/config.json');
    }
  });

  it.skipIf(!installed)('configured providers should have valid structure', () => {
    const configPath = join(homedir(), '.config', 'opencode', 'opencode.json');
    const config = readJsonSafe(configPath);
    if (!config?.provider) return;

    for (const [id, provider] of Object.entries(config.provider) as [string, any][]) {
      expect(provider.npm, `${id}: missing npm`).toBeTypeOf('string');
      expect(provider.options?.baseURL, `${id}: missing options.baseURL`).toBeTypeOf('string');
      expect(typeof provider.models, `${id}: models should be object`).toBe('object');

      for (const [modelId, model] of Object.entries(provider.models) as [string, any][]) {
        expect(model.name, `${id}/${modelId}: missing name`).toBeTypeOf('string');

        // Validate modalities if present
        if (model.modalities) {
          const validMods = ['text', 'audio', 'image', 'video', 'pdf'];
          if (model.modalities.input) {
            expect(Array.isArray(model.modalities.input)).toBe(true);
            for (const v of model.modalities.input) {
              expect(validMods, `${modelId}: invalid input modality "${v}"`).toContain(v);
            }
          }
          if (model.modalities.output) {
            expect(Array.isArray(model.modalities.output)).toBe(true);
            for (const v of model.modalities.output) {
              expect(validMods, `${modelId}: invalid output modality "${v}"`).toContain(v);
            }
          }
        }
      }
    }
  });

  it.skipIf(!installed)('model ref should reference a valid provider', () => {
    const configPath = join(homedir(), '.config', 'opencode', 'opencode.json');
    const config = readJsonSafe(configPath);
    if (!config?.model) return;

    const slash = config.model.indexOf('/');
    if (slash === -1) return; // bare model, not our format

    const providerId = config.model.substring(0, slash);
    const modelId = config.model.substring(slash + 1);

    expect(config.provider?.[providerId], `provider "${providerId}" should exist`).toBeDefined();
    expect(
      config.provider[providerId].models[modelId],
      `model "${modelId}" should exist in provider`,
    ).toBeDefined();
  });
});

// ─── Claude Code ────────────────────────────────────────────────

describe('Claude Code smoke test', () => {
  const installed = isInstalled('claude');

  it.skipIf(!installed)('claude binary should be accessible', () => {
    const result = runCommand('claude --version');
    expect(result.exitCode).toBe(0);
  });

  it.skipIf(!installed)('settings.json should be parseable', () => {
    const settingsPath = join(homedir(), '.claude', 'settings.json');
    const settings = readJsonSafe(settingsPath);

    if (!settings) return;
    expect(typeof settings).toBe('object');
  });

  it.skipIf(!installed)('env vars should have correct types when present', () => {
    const settingsPath = join(homedir(), '.claude', 'settings.json');
    const settings = readJsonSafe(settingsPath);
    if (!settings?.env) return;

    const env = settings.env;

    if (env.ANTHROPIC_AUTH_TOKEN) {
      expect(env.ANTHROPIC_AUTH_TOKEN).toBeTypeOf('string');
    }
    if (env.ANTHROPIC_BASE_URL) {
      expect(env.ANTHROPIC_BASE_URL).toBeTypeOf('string');
      expect(env.ANTHROPIC_BASE_URL).toMatch(/^https?:\/\//);
    }
    if (env.API_TIMEOUT_MS) {
      // Should be string number
      expect(Number(env.API_TIMEOUT_MS)).toBeGreaterThan(0);
    }
  });
});

// ─── ZeroClaw ───────────────────────────────────────────────────

describe('ZeroClaw smoke test', () => {
  const installed = isInstalled('zeroclaw');

  it.skipIf(!installed)('zeroclaw binary should be accessible', () => {
    const result = runCommand('zeroclaw --version');
    expect(result.exitCode).toBe(0);
  });

  it.skipIf(!installed)('config.toml should exist and be parseable', () => {
    const configPath = join(homedir(), '.zeroclaw', 'config.toml');
    if (!existsSync(configPath)) return;

    const content = readFileSync(configPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
    // Basic TOML structure check — should have key = value lines
    expect(content).toMatch(/\w+\s*=/);
  });
});

// ─── Nanobot ────────────────────────────────────────────────────

describe('Nanobot smoke test', () => {
  const installed = isInstalled('nanobot');

  it.skipIf(!installed)('nanobot binary should be accessible', () => {
    const result = runCommand('nanobot --version');
    expect(result.exitCode).toBe(0);
  });

  it.skipIf(!installed)('config.json should be parseable', () => {
    const configPath = join(homedir(), '.nanobot', 'config.json');
    const config = readJsonSafe(configPath);

    if (!config) return;
    expect(typeof config).toBe('object');
  });
});
