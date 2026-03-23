import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFs, type MockFs } from '../helpers/mock-fs.js';
import { join } from 'path';
import { homedir } from 'os';
import * as toml from '@iarna/toml';

const CONFIG_PATH = join(homedir(), '.zeroclaw', 'config.toml');

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

import { ZeroClawManager } from '../../src/lib/zeroclaw-manager.js';
import { PLANS } from '../../src/lib/constants.js';

const VOLCANO = PLANS['ssy_cp_lite'];
const BYTEPLUS = PLANS['ssy_cp_pro'];
const API_KEY = 'test-api-key-12345';

/** Seed a minimal onboarded config so loadPlanConfig won't throw */
function seedOnboarded(extra: Record<string, unknown> = {}) {
  const config = { default_temperature: 0.7, ...extra };
  mockFs._seed(CONFIG_PATH, toml.stringify(config as any));
}

/** Read back the TOML config from mock fs */
function readConfig(): Record<string, unknown> {
  const raw = mockFs._store.get(CONFIG_PATH);
  if (!raw) throw new Error('config.toml not found');
  return toml.parse(raw) as unknown as Record<string, unknown>;
}

describe('ZeroClawManager', () => {
  let manager: ZeroClawManager;

  beforeEach(() => {
    mockFs = createMockFs();
    manager = new ZeroClawManager();
  });

  // ─── loadPlanConfig ───────────────────────────────────────────

  describe('loadPlanConfig', () => {
    it('should throw when ZeroClaw is not onboarded', () => {
      expect(() => manager.loadPlanConfig(VOLCANO, API_KEY)).toThrow('尚未初始化');
    });

    it('should write api_key, default_provider, default_model', () => {
      seedOnboarded();
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = readConfig();
      expect(config.api_key).toBe(API_KEY);
      expect(config.default_provider).toBe(
        'custom:https://router.shengsuanyun.com/api/cp/v1',
      );
      expect(config.default_model).toBe(VOLCANO.models[0].id);
    });

    it('should use specified model when provided', () => {
      seedOnboarded();
      manager.loadPlanConfig(VOLCANO, API_KEY, 'kimi-k2.5');

      const config = readConfig();
      expect(config.default_model).toBe('kimi-k2.5');
    });

    it('default_provider should have custom: prefix', () => {
      seedOnboarded();
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = readConfig();
      expect((config.default_provider as string).startsWith('custom:')).toBe(true);
    });

    it('default_model should be bare ID (no provider prefix)', () => {
      seedOnboarded();
      manager.loadPlanConfig(VOLCANO, API_KEY, 'glm-4.7');

      const config = readConfig();
      expect(config.default_model).toBe('glm-4.7');
      expect((config.default_model as string).includes('/')).toBe(false);
    });

    it('should preserve existing config fields', () => {
      seedOnboarded({ default_temperature: 0.5, some_other: 'value' });
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = readConfig();
      expect(config.default_temperature).toBe(0.5);
      expect(config.some_other).toBe('value');
    });

    it('should handle Pro Plan plan', () => {
      seedOnboarded();
      manager.loadPlanConfig(BYTEPLUS, API_KEY);

      const config = readConfig();
      expect(config.default_provider).toBe(
        'custom:https://router.shengsuanyun.com/api/cp/v1',
      );
    });

    it('should clean up legacy model_providers entries', () => {
      seedOnboarded({
        model_providers: {
          'volcengine-coding-plan': { api_key: 'old' },
          'my-other-provider': { api_key: 'keep' },
        },
      });
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const config = readConfig();
      const providers = config.model_providers as Record<string, unknown> | undefined;
      expect(providers?.['volcengine-coding-plan']).toBeUndefined();
      expect(providers?.['my-other-provider']).toBeDefined();
    });
  });

  // ─── unloadPlanConfig ─────────────────────────────────────────

  describe('unloadPlanConfig', () => {
    beforeEach(() => {
      seedOnboarded();
      manager.loadPlanConfig(VOLCANO, API_KEY);
    });

    it('should remove default_provider, default_model, api_key', () => {
      manager.unloadPlanConfig('ssy_cp_lite');

      const config = readConfig();
      expect(config.default_provider).toBeUndefined();
      expect(config.default_model).toBeUndefined();
      expect(config.api_key).toBeUndefined();
    });

    it('should not modify config if plan does not match', () => {
      manager.unloadPlanConfig('ssy_cp_pro');

      // Volcano config should still be intact (byteplus was never loaded)
      const config = readConfig();
      expect(config.api_key).toBe(API_KEY);
      expect(config.default_provider).toContain('volces.com');
    });

    it('should handle no planId (remove all)', () => {
      manager.unloadPlanConfig();

      const config = readConfig();
      expect(config.default_provider).toBeUndefined();
      expect(config.api_key).toBeUndefined();
    });
  });

  // ─── detectCurrentConfig ──────────────────────────────────────

  describe('detectCurrentConfig', () => {
    it('should return null when no config exists', () => {
      const result = manager.detectCurrentConfig();
      expect(result).toEqual({ plan: null, apiKey: null });
    });

    it('should detect from custom: provider URL', () => {
      seedOnboarded();
      manager.loadPlanConfig(VOLCANO, API_KEY);

      const result = manager.detectCurrentConfig();
      expect(result.plan).toBe('ssy_cp_lite');
      expect(result.apiKey).toBe(API_KEY);
    });

    it('should detect Pro Plan plan', () => {
      seedOnboarded();
      manager.loadPlanConfig(BYTEPLUS, API_KEY);

      const result = manager.detectCurrentConfig();
      expect(result.plan).toBe('ssy_cp_pro');
    });

    it('should detect from legacy profile name', () => {
      seedOnboarded({
        default_provider: 'volcengine-coding-plan',
        model_providers: {
          'volcengine-coding-plan': { api_key: 'legacy-key' },
        },
      });

      const result = manager.detectCurrentConfig();
      expect(result.plan).toBe('ssy_cp_lite');
      expect(result.apiKey).toBe('legacy-key');
    });

    it('should fallback scan model_providers for legacy entries', () => {
      seedOnboarded({
        default_provider: 'something-else',
        model_providers: {
          'byteplus-coding-plan': { api_key: 'found-key' },
        },
      });

      const result = manager.detectCurrentConfig();
      expect(result.plan).toBe('ssy_cp_pro');
      expect(result.apiKey).toBe('found-key');
    });
  });

  // ─── isOnboarded ──────────────────────────────────────────────

  describe('isOnboarded', () => {
    it('should return false when config does not exist', () => {
      expect(manager.isOnboarded()).toBe(false);
    });

    it('should return true when config exists', () => {
      seedOnboarded();
      expect(manager.isOnboarded()).toBe(true);
    });
  });
});
