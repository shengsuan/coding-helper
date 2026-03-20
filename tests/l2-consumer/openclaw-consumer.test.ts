/**
 * L2b: Consumer Simulation — OpenClaw
 *
 * Replicates OpenClaw's config parsing logic to verify that coding-helper's
 * output would be correctly consumed at runtime. Based on reverse-engineering
 * of OpenClaw source code (model-catalog.ts, model-selection.ts, zod-schema, etc.).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFs, type MockFs } from '../helpers/mock-fs.js';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');
const AUTH_PATH = join(homedir(), '.openclaw', 'auth-profiles.json');
const SESSIONS_PATH = join(homedir(), '.openclaw', 'agents', 'main', 'sessions', 'sessions.json');

let mockFs: MockFs;

vi.mock('fs', () => ({
  existsSync: (...a: unknown[]) => mockFs.existsSync(...a),
  readFileSync: (...a: unknown[]) => mockFs.readFileSync(...a),
  writeFileSync: (...a: unknown[]) => mockFs.writeFileSync(...a),
  mkdirSync: (...a: unknown[]) => mockFs.mkdirSync(...a),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { logError: vi.fn() },
}));

import { OpenClawManager } from '../../src/lib/openclaw-manager.js';
import { PLANS } from '../../src/lib/constants.js';

const VOLCANO = PLANS['cp_test_lite'];
const BYTEPLUS = PLANS['cp_test_pro'];
const API_KEY = 'test-api-key-12345';

// ─── OpenClaw consumer simulation helpers ───────────────────────
// These replicate OpenClaw's actual parsing/validation logic.

/** OpenClaw zod schema: input must be Array<"text" | "image"> */
function validateModelInput(input: unknown): boolean {
  if (!Array.isArray(input)) return false;
  const allowed = ['text', 'image'];
  return input.every(v => allowed.includes(v));
}

/** OpenClaw model-catalog.ts: modelSupportsVision() */
function modelSupportsVision(model: { input?: string[] }): boolean {
  return model.input?.includes('image') ?? false;
}

/** OpenClaw model-catalog.ts: modelSupportsDocument() */
function modelSupportsDocument(model: { input?: string[] }): boolean {
  return model.input?.includes('document') ?? false;
}

/** OpenClaw model-selection.ts: buildAllowedModelSet() — if allowlist exists, only listed models are available */
function buildAllowedModelSet(
  allowlist: Record<string, unknown> | undefined,
): Set<string> | null {
  if (!allowlist || Object.keys(allowlist).length === 0) return null;
  return new Set(Object.keys(allowlist));
}

/** OpenClaw model-selection.ts: resolveDefaultModel() */
function resolveDefaultModel(config: {
  agents?: { defaults?: { model?: { primary?: string } } };
}): { provider: string; model: string } | null {
  const primary = config.agents?.defaults?.model?.primary;
  if (!primary) return null;
  const parts = primary.split('/');
  if (parts.length !== 2) return null;
  return { provider: parts[0], model: parts[1] };
}

/** OpenClaw sessions: resolveStoredModelOverride() */
function resolveStoredModelOverride(entry: {
  modelOverride?: string;
  providerOverride?: string;
}): { provider: string; model: string } | null {
  if (!entry.modelOverride) return null;
  return {
    provider: entry.providerOverride || '',
    model: entry.modelOverride,
  };
}

/** Simulates OpenClaw's full model resolution chain */
function resolveActiveModel(
  config: any,
  sessionEntry?: any,
): { provider: string; model: string; source: string } | null {
  // Priority 1: session modelOverride
  if (sessionEntry) {
    const override = resolveStoredModelOverride(sessionEntry);
    if (override) {
      return { ...override, source: 'session-override' };
    }
  }
  // Priority 2: config model.primary
  const defaultModel = resolveDefaultModel(config);
  if (defaultModel) {
    return { ...defaultModel, source: 'config-primary' };
  }
  return null;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('OpenClaw Consumer Simulation', () => {
  let manager: OpenClawManager;

  beforeEach(() => {
    mockFs = createMockFs();
    manager = new OpenClawManager();
  });

  describe('Provider parsing', () => {
    it('should produce a valid provider structure consumable by OpenClaw', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const provider = config.models.providers['cp_test_lite'];

      // OpenClaw expects these exact fields
      expect(provider.baseUrl).toBeTypeOf('string');
      expect(provider.apiKey).toBeTypeOf('string');
      expect(provider.api).toBe('openai-completions');
      expect(Array.isArray(provider.models)).toBe(true);
      expect(provider.models.length).toBeGreaterThan(0);
    });

    it('should produce models with required fields (id, name, contextWindow, maxTokens)', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.models.providers['cp_test_lite'].models;

      for (const model of models) {
        expect(model.id, `${model.id} should have id`).toBeTypeOf('string');
        expect(model.name, `${model.id} should have name`).toBeTypeOf('string');
        expect(model.contextWindow, `${model.id} should have contextWindow`).toBeTypeOf('number');
        expect(model.maxTokens, `${model.id} should have maxTokens`).toBeTypeOf('number');
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.maxTokens).toBeGreaterThan(0);
      }
    });
  });

  describe('Model input/vision validation', () => {
    it('should produce valid input arrays per OpenClaw zod schema', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.models.providers['cp_test_lite'].models;

      for (const model of models) {
        if (model.input !== undefined) {
          expect(
            validateModelInput(model.input),
            `${model.id}: input ${JSON.stringify(model.input)} should match zod schema`,
          ).toBe(true);
        }
      }
    });

    it('modelSupportsVision should return true for image-capable models', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.models.providers['cp_test_lite'].models;

      const arkCode = models.find((m: any) => m.id === 'anthropic/claude-sonnet-4.6');
      expect(modelSupportsVision(arkCode)).toBe(true);

      const kimiK25 = models.find((m: any) => m.id === 'kimi-k2.5');
      expect(modelSupportsVision(kimiK25)).toBe(true);
    });

    it('modelSupportsVision should return false for text-only models', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.models.providers['cp_test_lite'].models;

      const glm = models.find((m: any) => m.id === 'glm-4.7');
      expect(modelSupportsVision(glm)).toBe(false);

      // deepseek-v3.2 has no input field → default text-only
      const deepseek = models.find((m: any) => m.id === 'deepseek-v3.2');
      expect(modelSupportsVision(deepseek)).toBe(false);
    });

    it('Pro Plan models should not support vision (all text-only)', () => {
      manager.loadPlanConfig(BYTEPLUS, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.models.providers['cp_test_pro'].models;

      for (const model of models) {
        expect(
          modelSupportsVision(model),
          `Pro Plan ${model.id} should NOT support vision`,
        ).toBe(false);
      }
    });
  });

  describe('Allowlist (agents.defaults.models)', () => {
    it('all plan models should be in the allowlist', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const allowedSet = buildAllowedModelSet(config.agents?.defaults?.models);

      expect(allowedSet).not.toBeNull();

      for (const m of VOLCANO.models) {
        const ref = `cp_test_lite/${m.id}`;
        expect(
          allowedSet!.has(ref),
          `${ref} should be in allowlist for /model switching`,
        ).toBe(true);
      }
    });

    it('model.primary should be within the allowlist', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY, 'glm-4.7');
      const config = mockFs._readJson(CONFIG_PATH) as any;

      const primary = config.agents.defaults.model.primary;
      const allowedSet = buildAllowedModelSet(config.agents?.defaults?.models);

      expect(allowedSet!.has(primary)).toBe(true);
    });

    it('after loading two plans, all models from both should be in allowlist', () => {
      manager.loadPlanConfig(VOLCANO, 'key-1');
      manager.loadPlanConfig(BYTEPLUS, 'key-2');
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const allowedSet = buildAllowedModelSet(config.agents?.defaults?.models);

      for (const m of VOLCANO.models) {
        expect(allowedSet!.has(`cp_test_lite/${m.id}`)).toBe(true);
      }
      for (const m of BYTEPLUS.models) {
        expect(allowedSet!.has(`cp_test_pro/${m.id}`)).toBe(true);
      }
    });
  });

  describe('Model resolution chain', () => {
    it('new session (no override) should resolve to model.primary', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY, 'kimi-k2.5');
      const config = mockFs._readJson(CONFIG_PATH) as any;

      // Simulate new session with no override
      const result = resolveActiveModel(config, {});
      expect(result).toEqual({
        provider: 'cp_test_lite',
        model: 'kimi-k2.5',
        source: 'config-primary',
      });
    });

    it('session with modelOverride should take priority over model.primary', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY, 'anthropic/claude-sonnet-4.6');
      const config = mockFs._readJson(CONFIG_PATH) as any;

      // Simulate session where user ran /model glm-4.7
      const sessionEntry = {
        modelOverride: 'glm-4.7',
        providerOverride: 'cp_test_lite',
      };

      const result = resolveActiveModel(config, sessionEntry);
      expect(result).toEqual({
        provider: 'cp_test_lite',
        model: 'glm-4.7',
        source: 'session-override',
      });
    });

    it('coding-helper session update should produce valid overrides', () => {
      // Seed existing session
      mockFs._seed(SESSIONS_PATH, JSON.stringify({
        'agent:main:main': { model: 'old', modelProvider: 'old' },
      }));

      manager.loadPlanConfig(VOLCANO, API_KEY, 'doubao-seed-code');
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const sessions = mockFs._readJson(SESSIONS_PATH) as any;
      const entry = sessions['agent:main:main'];

      // Session override should win
      const result = resolveActiveModel(config, entry);
      expect(result!.model).toBe('doubao-seed-code');
      expect(result!.provider).toBe('cp_test_lite');
      expect(result!.source).toBe('session-override');
    });

    it('/new scenario: new session falls back to model.primary', () => {
      // Simulate: coding-helper set config, then user /model switches, then /new
      mockFs._seed(SESSIONS_PATH, JSON.stringify({
        'agent:main:main': { model: 'old', modelProvider: 'old' },
      }));

      manager.loadPlanConfig(VOLCANO, API_KEY, 'anthropic/claude-sonnet-4.6');
      const config = mockFs._readJson(CONFIG_PATH) as any;

      // Existing session has override from coding-helper
      const sessions = mockFs._readJson(SESSIONS_PATH) as any;
      const existingEntry = sessions['agent:main:main'];
      expect(resolveActiveModel(config, existingEntry)!.source).toBe('session-override');

      // /new creates fresh session — no modelOverride
      const newSessionEntry = {};
      const result = resolveActiveModel(config, newSessionEntry);
      expect(result!.model).toBe('anthropic/claude-sonnet-4.6');
      expect(result!.source).toBe('config-primary');
    });
  });

  describe('Auth profile', () => {
    it('should produce valid auth profile consumable by OpenClaw', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);
      const auth = mockFs._readJson(AUTH_PATH) as any;

      // OpenClaw expects profiles.<planId>:default with type and key
      const profile = auth.profiles['cp_test_lite:default'];
      expect(profile).toBeDefined();
      expect(profile.type).toBe('api_key');
      expect(profile.key).toBeTypeOf('string');
      expect(profile.key.length).toBeGreaterThan(0);
    });
  });

  describe('model.primary format', () => {
    it('should be parseable as provider/model', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY, 'glm-4.7');
      const config = mockFs._readJson(CONFIG_PATH) as any;

      const resolved = resolveDefaultModel(config);
      expect(resolved).not.toBeNull();
      expect(resolved!.provider).toBe('cp_test_lite');
      expect(resolved!.model).toBe('glm-4.7');
    });

    it('provider in model.primary should match a configured provider', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;

      const resolved = resolveDefaultModel(config);
      expect(config.models.providers[resolved!.provider]).toBeDefined();
    });

    it('model in model.primary should exist in provider models', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY, 'kimi-k2.5');
      const config = mockFs._readJson(CONFIG_PATH) as any;

      const resolved = resolveDefaultModel(config);
      const providerModels = config.models.providers[resolved!.provider].models;
      const found = providerModels.find((m: any) => m.id === resolved!.model);
      expect(found, `model ${resolved!.model} should exist in provider models`).toBeDefined();
    });
  });
});
