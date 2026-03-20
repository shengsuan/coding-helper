import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFs, type MockFs } from '../helpers/mock-fs.js';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');
const AUTH_PATH = join(homedir(), '.openclaw', 'auth-profiles.json');
const SESSIONS_PATH = join(homedir(), '.openclaw', 'agents', 'main', 'sessions', 'sessions.json');

let mockFs: MockFs;

vi.mock('fs', () => {
  // Lazy — replaced in beforeEach
  return {
    existsSync: (...a: unknown[]) => mockFs.existsSync(...a),
    readFileSync: (...a: unknown[]) => mockFs.readFileSync(...a),
    writeFileSync: (...a: unknown[]) => mockFs.writeFileSync(...a),
    mkdirSync: (...a: unknown[]) => mockFs.mkdirSync(...a),
  };
});

// Suppress console.warn from manager
vi.mock('../../src/utils/logger.js', () => ({
  logger: { logError: vi.fn() },
}));

import { OpenClawManager } from '../../src/lib/openclaw-manager.js';
import { PLANS } from '../../src/lib/constants.js';

const VOLCANO = PLANS['cp_test_lite'];
const BYTEPLUS = PLANS['cp_test_pro'];
const API_KEY = 'test-api-key-12345';

describe('OpenClawManager', () => {
  let manager: OpenClawManager;

  beforeEach(() => {
    mockFs = createMockFs();
    manager = new OpenClawManager();
  });

  // ─── loadPlanConfig ───────────────────────────────────────────

  describe('loadPlanConfig', () => {
    it('should write openclaw.json with correct provider structure', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as Record<string, unknown>;
      const providers = (config.models as any).providers;

      expect(providers['cp_test_lite']).toBeDefined();
      expect(providers['cp_test_lite'].baseUrl).toBe(VOLCANO.baseUrl);
      expect(providers['cp_test_lite'].apiKey).toBe(API_KEY);
      expect(providers['cp_test_lite'].api).toBe('openai-completions');
    });

    it('should write all plan models with correct fields', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.models.providers['cp_test_lite'].models;

      expect(models).toHaveLength(VOLCANO.models.length);

      for (const planModel of VOLCANO.models) {
        const written = models.find((m: any) => m.id === planModel.id);
        expect(written, `model ${planModel.id} should exist`).toBeDefined();
        expect(written.name).toBe(planModel.id);
        expect(written.contextWindow).toBe(planModel.contextLength);
        expect(written.maxTokens).toBe(planModel.maxTokens);
      }
    });

    it('should write input modalities when defined on model', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.models.providers['cp_test_lite'].models;

      // ark-code-latest has modalities: { input: ["text", "image"] }
      const arkCode = models.find((m: any) => m.id === 'anthropic/claude-sonnet-4.6');
      expect(arkCode.input).toEqual(['text', 'image']);

      // glm-4.7 has modalities: { input: ["text"] }
      const glm = models.find((m: any) => m.id === 'glm-4.7');
      expect(glm.input).toEqual(['text']);

      // deepseek-v3.2 has no modalities
      const deepseek = models.find((m: any) => m.id === 'deepseek-v3.2');
      expect(deepseek.input).toBeUndefined();
    });

    it('should set agents.defaults.model.primary with planId prefix', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.agents.defaults.model.primary).toBe(
        `cp_test_lite/${VOLCANO.models[0].id}`,
      );
    });

    it('should use specified model when provided', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY, 'kimi-k2.5');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.agents.defaults.model.primary).toBe('cp_test_lite/kimi-k2.5');
    });

    it('should write allowlist with all plan models', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      const allowlist = config.agents.defaults.models;

      for (const m of VOLCANO.models) {
        const ref = `cp_test_lite/${m.id}`;
        expect(allowlist[ref], `allowlist should contain ${ref}`).toEqual({});
      }
    });

    it('should write auth-profiles.json with correct profile', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const auth = mockFs._readJson(AUTH_PATH) as any;
      expect(auth.profiles['cp_test_lite:default']).toEqual({
        type: 'api_key',
        key: API_KEY,
      });
    });

    it('should update existing sessions with modelOverride', () => {
      const existingSessions = {
        'agent:main:main': {
          model: 'old-model',
          modelProvider: 'old-provider',
          contextTokens: 128000,
          someOtherField: 'keep-me',
        },
      };
      mockFs._seed(SESSIONS_PATH, JSON.stringify(existingSessions));

      manager.loadPlanConfig(VOLCANO, API_KEY, 'glm-4.7');

      const sessions = mockFs._readJson(SESSIONS_PATH) as any;
      const entry = sessions['agent:main:main'];

      expect(entry.modelOverride).toBe('glm-4.7');
      expect(entry.providerOverride).toBe('cp_test_lite');
      expect(entry.model).toBeUndefined();        // cleared
      expect(entry.modelProvider).toBeUndefined(); // cleared
      expect(entry.contextTokens).toBeUndefined(); // cleared
      expect(entry.updatedAt).toBeTypeOf('number');
      expect(entry.someOtherField).toBe('keep-me'); // preserved
    });

    it('should skip session update when sessions.json does not exist', () => {
      // No sessions.json seeded
      manager.loadPlanConfig(VOLCANO, API_KEY);

      // Should not throw, sessions.json should not be written
      expect(mockFs._store.has(SESSIONS_PATH)).toBe(false);
    });

    it('should merge with existing config preserving other fields', () => {
      const existing = {
        someCustomSetting: true,
        models: {
          providers: {
            'my-other-provider': { baseUrl: 'https://example.com', models: [] },
          },
        },
      };
      mockFs._seed(CONFIG_PATH, JSON.stringify(existing));

      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.someCustomSetting).toBe(true);
      expect(config.models.providers['my-other-provider']).toBeDefined();
      expect(config.models.providers['cp_test_lite']).toBeDefined();
    });

    it('should deduplicate providers with same domain', () => {
      const existing = {
        models: {
          providers: {
            'custom-volc': {
              baseUrl: 'https://router.shengsuanyun.com/api/cp/v1',
              models: [],
            },
          },
        },
      };
      mockFs._seed(CONFIG_PATH, JSON.stringify(existing));

      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.models.providers['custom-volc']).toBeUndefined();
      expect(config.models.providers['cp_test_lite']).toBeDefined();
    });

    it('should handle Pro Plan plan correctly', () => {
      manager.loadPlanConfig(BYTEPLUS, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.models.providers['cp_test_pro'].baseUrl).toBe(BYTEPLUS.baseUrl);
      expect(config.agents.defaults.model.primary).toBe(
        `cp_test_pro/${BYTEPLUS.models[0].id}`,
      );

      const auth = mockFs._readJson(AUTH_PATH) as any;
      expect(auth.profiles['cp_test_pro:default'].key).toBe(API_KEY);
    });

    it('should handle switching from one plan to another', () => {
      // First load Volcano
      manager.loadPlanConfig(VOLCANO, 'key-1');
      // Then load Pro Plan
      manager.loadPlanConfig(BYTEPLUS, 'key-2', 'kimi-k2.5');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      // Both providers should exist
      expect(config.models.providers['cp_test_lite']).toBeDefined();
      expect(config.models.providers['cp_test_pro']).toBeDefined();
      // model.primary should point to the latest
      expect(config.agents.defaults.model.primary).toBe('cp_test_pro/kimi-k2.5');
    });
  });

  // ─── unloadPlanConfig ─────────────────────────────────────────

  describe('unloadPlanConfig', () => {
    beforeEach(() => {
      manager.loadPlanConfig(VOLCANO, API_KEY);
    });

    it('should remove specified plan provider', () => {
      manager.unloadPlanConfig('cp_test_lite');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.models?.providers?.['cp_test_lite']).toBeUndefined();
    });

    it('should remove auth profile', () => {
      manager.unloadPlanConfig('cp_test_lite');

      const auth = mockFs._readJson(AUTH_PATH) as any;
      expect(auth.profiles?.['cp_test_lite:default']).toBeUndefined();
    });

    it('should clear model.primary when it references removed plan', () => {
      manager.unloadPlanConfig('cp_test_lite');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.agents?.defaults?.model?.primary).toBeUndefined();
    });

    it('should remove both plans when no planId specified', () => {
      manager.loadPlanConfig(BYTEPLUS, 'key-2');
      manager.unloadPlanConfig();

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.models?.providers?.['cp_test_lite']).toBeUndefined();
      expect(config.models?.providers?.['cp_test_pro']).toBeUndefined();
    });

    it('should preserve other plan when only one is removed', () => {
      manager.loadPlanConfig(BYTEPLUS, 'key-2', 'kimi-k2.5');
      manager.unloadPlanConfig('cp_test_lite');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.models.providers['cp_test_pro']).toBeDefined();
      expect(config.agents.defaults.model.primary).toBe('cp_test_pro/kimi-k2.5');
    });
  });

  // ─── detectCurrentConfig ──────────────────────────────────────

  describe('detectCurrentConfig', () => {
    it('should return null when no config exists', () => {
      const result = manager.detectCurrentConfig();
      expect(result).toEqual({ plan: null, apiKey: null });
    });

    it('should detect Volcano plan from model.primary', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const result = manager.detectCurrentConfig();
      expect(result.plan).toBe('cp_test_lite');
      expect(result.apiKey).toBe(API_KEY);
    });

    it('should detect Pro Plan plan', () => {
      manager.loadPlanConfig(BYTEPLUS, API_KEY);

      const result = manager.detectCurrentConfig();
      expect(result.plan).toBe('cp_test_pro');
      expect(result.apiKey).toBe(API_KEY);
    });

    it('should fallback scan when model.primary is missing', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      // Remove model.primary manually
      const config = mockFs._readJson(CONFIG_PATH) as any;
      delete config.agents.defaults.model;
      mockFs._seed(CONFIG_PATH, JSON.stringify(config));

      const result = manager.detectCurrentConfig();
      expect(result.plan).toBe('cp_test_lite');
    });
  });
});
