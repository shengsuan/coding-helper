import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFs, type MockFs } from '../helpers/mock-fs.js';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_PATH = join(homedir(), '.nanobot', 'config.json');

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

import { NanobotManager } from '../../src/lib/nanobot-manager.js';
import { PLANS } from '../../src/lib/constants.js';

const VOLCANO = PLANS['ssy_cp_lite'];
const BYTEPLUS = PLANS['ssy_cp_pro'];
const API_KEY = 'test-api-key-12345';

/** Seed a new-version nanobot config (has named providers) */
function seedNewNanobot() {
  mockFs._seed(CONFIG_PATH, JSON.stringify({
    providers: {
      volcengineCodingPlan: { apiKey: '', apiBase: null },
      byteplusCodingPlan: { apiKey: '', apiBase: null },
    },
    agents: { defaults: {} },
  }));
}

/** Seed a legacy nanobot config (only "custom" slot) */
function seedLegacyNanobot() {
  mockFs._seed(CONFIG_PATH, JSON.stringify({
    providers: {},
    agents: { defaults: {} },
  }));
}

describe('NanobotManager', () => {
  let manager: NanobotManager;

  beforeEach(() => {
    mockFs = createMockFs();
    manager = new NanobotManager();
  });

  // ─── New-version Nanobot ──────────────────────────────────────

  describe('loadPlanConfig (new nanobot)', () => {
    beforeEach(() => seedNewNanobot());

    it('should write named provider with apiKey and apiBase', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.providers.volcengineCodingPlan.apiKey).toBe(API_KEY);
      expect(config.providers.volcengineCodingPlan.apiBase).toBe(VOLCANO.baseUrl);
    });

    it('should set agents.defaults with snake_case provider name', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.agents.defaults.provider).toBe('volcengine_coding_plan');
      expect(config.agents.defaults.model).toBe(VOLCANO.models[0].id);
    });

    it('should use specified model (bare ID, no prefix)', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY, 'glm-4.7');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.agents.defaults.model).toBe('glm-4.7');
      expect(config.agents.defaults.model.includes('/')).toBe(false);
    });

    it('should clean up legacy custom provider', () => {
      // Add a stale custom entry
      const config = mockFs._readJson(CONFIG_PATH) as any;
      config.providers.custom = { apiKey: 'old', apiBase: 'old-url' };
      mockFs._seed(CONFIG_PATH, JSON.stringify(config));

      manager.loadPlanConfig(VOLCANO, API_KEY);

      const after = mockFs._readJson(CONFIG_PATH) as any;
      expect(after.providers.custom).toBeUndefined();
    });

    it('should handle Pro Plan plan', () => {
      manager.loadPlanConfig(BYTEPLUS, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.providers.byteplusCodingPlan.apiKey).toBe(API_KEY);
      expect(config.providers.byteplusCodingPlan.apiBase).toBe(BYTEPLUS.baseUrl);
      expect(config.agents.defaults.provider).toBe('byteplus_coding_plan');
    });

    it('should preserve other providers', () => {
      const config = mockFs._readJson(CONFIG_PATH) as any;
      config.providers.myCustomProvider = { apiKey: 'keep', apiBase: 'https://example.com' };
      mockFs._seed(CONFIG_PATH, JSON.stringify(config));

      manager.loadPlanConfig(VOLCANO, API_KEY);

      const after = mockFs._readJson(CONFIG_PATH) as any;
      expect(after.providers.myCustomProvider).toBeDefined();
    });
  });

  // ─── Legacy Nanobot ───────────────────────────────────────────

  describe('loadPlanConfig (legacy nanobot)', () => {
    beforeEach(() => seedLegacyNanobot());

    it('should write to custom provider slot', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.providers.custom.apiKey).toBe(API_KEY);
      expect(config.providers.custom.apiBase).toBe(VOLCANO.baseUrl);
    });

    it('should set agents.defaults.provider to "custom"', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.agents.defaults.provider).toBe('custom');
    });

    it('should use bare model ID', () => {
      manager.loadPlanConfig(VOLCANO, API_KEY, 'kimi-k2.5');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.agents.defaults.model).toBe('kimi-k2.5');
    });
  });

  // ─── unloadPlanConfig ─────────────────────────────────────────

  describe('unloadPlanConfig (new nanobot)', () => {
    beforeEach(() => {
      seedNewNanobot();
      manager.loadPlanConfig(VOLCANO, API_KEY);
    });

    it('should clear apiKey and apiBase but keep provider key', () => {
      manager.unloadPlanConfig('ssy_cp_lite');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      // Key should still exist (to preserve new-nanobot detection)
      expect(config.providers.volcengineCodingPlan).toBeDefined();
      expect(config.providers.volcengineCodingPlan.apiKey).toBe('');
      expect(config.providers.volcengineCodingPlan.apiBase).toBeNull();
    });

    it('should clear agents.defaults model and provider', () => {
      manager.unloadPlanConfig('ssy_cp_lite');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.agents.defaults.model).toBeUndefined();
      expect(config.agents.defaults.provider).toBeUndefined();
    });
  });

  describe('unloadPlanConfig (legacy nanobot)', () => {
    beforeEach(() => {
      seedLegacyNanobot();
      manager.loadPlanConfig(VOLCANO, API_KEY);
    });

    it('should delete custom provider entirely', () => {
      manager.unloadPlanConfig();

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.providers.custom).toBeUndefined();
    });
  });

  // ─── detectCurrentConfig ──────────────────────────────────────

  describe('detectCurrentConfig', () => {
    it('should return null when no config exists', () => {
      expect(manager.detectCurrentConfig()).toEqual({ plan: null, apiKey: null });
    });

    it('should detect new-nanobot Volcano plan', () => {
      seedNewNanobot();
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const result = manager.detectCurrentConfig();
      expect(result.plan).toBe('ssy_cp_lite');
      expect(result.apiKey).toBe(API_KEY);
    });

    it('should detect new-nanobot Pro Plan plan', () => {
      seedNewNanobot();
      manager.loadPlanConfig(BYTEPLUS, API_KEY);

      const result = manager.detectCurrentConfig();
      expect(result.plan).toBe('ssy_cp_pro');
      expect(result.apiKey).toBe(API_KEY);
    });

    it('should detect legacy nanobot from custom slot', () => {
      seedLegacyNanobot();
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const result = manager.detectCurrentConfig();
      expect(result.plan).toBe('ssy_cp_lite');
      expect(result.apiKey).toBe(API_KEY);
    });

    it('should fallback scan named providers when defaults dont match', () => {
      seedNewNanobot();
      manager.loadPlanConfig(VOLCANO, API_KEY);

      // Clear defaults.provider to force fallback
      const config = mockFs._readJson(CONFIG_PATH) as any;
      delete config.agents.defaults.provider;
      mockFs._seed(CONFIG_PATH, JSON.stringify(config));

      const result = manager.detectCurrentConfig();
      expect(result.plan).toBe('ssy_cp_lite');
      expect(result.apiKey).toBe(API_KEY);
    });

    it('should return null after unload', () => {
      seedNewNanobot();
      manager.loadPlanConfig(VOLCANO, API_KEY);
      manager.unloadPlanConfig('ssy_cp_lite');

      const result = manager.detectCurrentConfig();
      // apiKey is cleared to '', so detection should fail
      expect(result.apiKey).toBeFalsy();
    });
  });
});
