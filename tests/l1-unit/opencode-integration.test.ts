import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFs, type MockFs } from '../helpers/mock-fs.js';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_PATH = join(homedir(), '.config', 'opencode', 'opencode.json');
const LEGACY_AUTH_PATH = join(homedir(), '.local', 'share', 'opencode', 'auth.json');

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

import { OpenCodeIntegration } from '../../src/lib/opencode-integration.js';
import { PLANS } from '../../src/lib/constants.js';

const VOLCANO = PLANS['ssy_cp_lite'];
const BYTEPLUS = PLANS['ssy_cp_pro'];
const API_KEY = 'test-api-key-12345';

describe('OpenCodeIntegration', () => {
  let integration: OpenCodeIntegration;

  beforeEach(() => {
    mockFs = createMockFs();
    integration = new OpenCodeIntegration();
  });

  // ─── loadPlanConfig ───────────────────────────────────────────

  describe('loadPlanConfig', () => {
    it('should write opencode.json with $schema', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.$schema).toBe('https://opencode.ai/config.json');
    });

    it('should write model with planId/modelId format', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.model).toBe(`ssy_cp_lite/${VOLCANO.models[0].id}`);
    });

    it('should use specified model when provided', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY, 'kimi-k2.5');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.model).toBe('ssy_cp_lite/kimi-k2.5');
    });

    it('should write provider with correct structure', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      const provider = config.provider['ssy_cp_lite'];

      expect(provider.npm).toBe('@ai-sdk/openai-compatible');
      expect(provider.name).toBe(VOLCANO.name);
      expect(provider.options.baseURL).toBe(VOLCANO.baseUrl);
      expect(provider.options.apiKey).toBe(API_KEY);
    });

    it('should write apiKey in provider.options (not separate auth.json)', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.provider['ssy_cp_lite'].options.apiKey).toBe(API_KEY);

      // auth.json should NOT be written
      expect(mockFs._store.has(LEGACY_AUTH_PATH)).toBe(false);
    });

    it('should write all plan models with limit fields', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.provider['ssy_cp_lite'].models;

      for (const planModel of VOLCANO.models) {
        const written = models[planModel.id];
        expect(written, `model ${planModel.id} should exist`).toBeDefined();
        expect(written.name).toBe(planModel.id);
        expect(written.limit.context).toBe(planModel.contextLength);
        expect(written.limit.output).toBe(4096);
      }
    });

    it('should write modalities when defined on model', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.provider['ssy_cp_lite'].models;

      // ark-code-latest has modalities
      expect(models['anthropic/claude-sonnet-4.6'].modalities).toEqual({
        input: ['text', 'image'],
        output: ['text'],
      });

      // glm-4.7 has text-only modalities
      expect(models['glm-4.7'].modalities).toEqual({
        input: ['text'],
        output: ['text'],
      });

      // deepseek-v3.2 has no modalities
      expect(models['deepseek-v3.2'].modalities).toBeUndefined();
    });

    it('should remove legacy defaultModel key if present', () => {
      mockFs._seed(CONFIG_PATH, JSON.stringify({ defaultModel: 'old-model' }));

      integration.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.defaultModel).toBeUndefined();
    });

    it('should merge with existing config', () => {
      mockFs._seed(CONFIG_PATH, JSON.stringify({
        $schema: 'https://opencode.ai/config.json',
        theme: 'catppuccin',
        provider: {
          'other-provider': { npm: 'other', models: {} },
        },
      }));

      integration.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.theme).toBe('catppuccin');
      expect(config.provider['other-provider']).toBeDefined();
      expect(config.provider['ssy_cp_lite']).toBeDefined();
    });

    it('should handle Pro Plan plan', () => {
      integration.loadPlanConfig(BYTEPLUS, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.model).toBe(`ssy_cp_pro/${BYTEPLUS.models[0].id}`);
      expect(config.provider['ssy_cp_pro'].options.baseURL).toBe(BYTEPLUS.baseUrl);
    });

    it('should have different modalities for same model across plans', () => {
      // Volcano: ark-code-latest has image input
      integration.loadPlanConfig(VOLCANO, 'key-1');
      let config = mockFs._readJson(CONFIG_PATH) as any;
      const volcModalities = config.provider['ssy_cp_lite'].models['anthropic/claude-sonnet-4.6'].modalities;

      // Pro Plan: ark-code-latest has text-only input
      integration.loadPlanConfig(BYTEPLUS, 'key-2');
      config = mockFs._readJson(CONFIG_PATH) as any;
      const bpModalities = config.provider['ssy_cp_pro'].models['anthropic/claude-sonnet-4.6'].modalities;

      // They should differ (volcano supports image, byteplus doesn't)
      expect(volcModalities.input).toContain('image');
      expect(bpModalities.input).not.toContain('image');
    });
  });

  // ─── unloadPlanConfig ─────────────────────────────────────────

  describe('unloadPlanConfig', () => {
    beforeEach(() => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
    });

    it('should remove specified plan provider', () => {
      integration.unloadPlanConfig('ssy_cp_lite');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.provider?.['ssy_cp_lite']).toBeUndefined();
    });

    it('should clear model when it references removed plan', () => {
      integration.unloadPlanConfig('ssy_cp_lite');

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.model).toBeUndefined();
    });

    it('should remove both plans when no planId specified', () => {
      integration.loadPlanConfig(BYTEPLUS, 'key-2');
      integration.unloadPlanConfig();

      const config = mockFs._readJson(CONFIG_PATH) as any;
      expect(config.provider?.['ssy_cp_lite']).toBeUndefined();
      expect(config.provider?.['ssy_cp_pro']).toBeUndefined();
    });

    it('should clean up legacy auth.json entries', () => {
      // Seed a legacy auth file with two entries so the file gets re-saved
      mockFs._seed(LEGACY_AUTH_PATH, JSON.stringify({
        'ssy_cp_lite': { type: 'api', key: 'old-key' },
        'other-entry': { type: 'api', key: 'other-key' },
      }));

      integration.unloadPlanConfig('ssy_cp_lite');

      const auth = mockFs._readJson(LEGACY_AUTH_PATH) as any;
      expect(auth['ssy_cp_lite']).toBeUndefined();
      expect(auth['other-entry']).toBeDefined(); // preserved
    });
  });

  // ─── detectCurrentConfig ──────────────────────────────────────

  describe('detectCurrentConfig', () => {
    it('should return null when no config exists', () => {
      const result = integration.detectCurrentConfig();
      expect(result).toEqual({ plan: null, apiKey: null });
    });

    it('should detect from provider.options.apiKey', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const result = integration.detectCurrentConfig();
      expect(result.plan).toBe('ssy_cp_lite');
      expect(result.apiKey).toBe(API_KEY);
    });

    it('should fallback to legacy auth.json', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      // Remove apiKey from options, add to legacy auth
      const config = mockFs._readJson(CONFIG_PATH) as any;
      delete config.provider['ssy_cp_lite'].options.apiKey;
      mockFs._seed(CONFIG_PATH, JSON.stringify(config));
      mockFs._seed(LEGACY_AUTH_PATH, JSON.stringify({
        'ssy_cp_lite': { type: 'api', key: 'legacy-key' },
      }));

      const result = integration.detectCurrentConfig();
      expect(result.plan).toBe('ssy_cp_lite');
      expect(result.apiKey).toBe('legacy-key');
    });

    it('should fallback scan when model key is missing', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const config = mockFs._readJson(CONFIG_PATH) as any;
      delete config.model;
      mockFs._seed(CONFIG_PATH, JSON.stringify(config));

      const result = integration.detectCurrentConfig();
      expect(result.plan).toBe('ssy_cp_lite');
    });
  });
});
