/**
 * L2b: Consumer Simulation — OpenCode
 *
 * Replicates OpenCode's config parsing logic to verify that coding-helper's
 * output would be correctly consumed at runtime. Based on reverse-engineering
 * of OpenCode source code (provider.ts, models.ts, transform.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFs, type MockFs } from '../helpers/mock-fs.js';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_PATH = join(homedir(), '.config', 'opencode', 'opencode.json');

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

// ─── OpenCode consumer simulation helpers ───────────────────────
// Replicate OpenCode's provider/model parsing from provider.ts

type Modality = 'text' | 'audio' | 'image' | 'video' | 'pdf';

interface Capabilities {
  input: Record<Modality, boolean>;
  output: Record<Modality, boolean>;
}

/** OpenCode provider.ts: fromConfigModel() — maps modalities to capabilities */
function mapModalitiesToCapabilities(
  modalities?: { input?: string[]; output?: string[] },
  existing?: Capabilities,
): Capabilities {
  const allModalities: Modality[] = ['text', 'audio', 'image', 'video', 'pdf'];

  return {
    input: Object.fromEntries(
      allModalities.map(m => [
        m,
        modalities?.input?.includes(m)
          ?? existing?.input[m]
          ?? (m === 'text'),
      ]),
    ) as Record<Modality, boolean>,
    output: Object.fromEntries(
      allModalities.map(m => [
        m,
        modalities?.output?.includes(m)
          ?? existing?.output[m]
          ?? (m === 'text'),
      ]),
    ) as Record<Modality, boolean>,
  };
}

/** OpenCode models.ts: validates modalities against zod schema */
function validateOpenCodeModalities(
  modalities: unknown,
): boolean {
  if (modalities === undefined) return true; // optional
  if (typeof modalities !== 'object' || modalities === null) return false;

  const m = modalities as Record<string, unknown>;
  const allowed: Modality[] = ['text', 'audio', 'image', 'video', 'pdf'];

  if (m.input !== undefined) {
    if (!Array.isArray(m.input)) return false;
    if (!m.input.every((v: string) => allowed.includes(v as Modality))) return false;
  }
  if (m.output !== undefined) {
    if (!Array.isArray(m.output)) return false;
    if (!m.output.every((v: string) => allowed.includes(v as Modality))) return false;
  }

  return true;
}

/** OpenCode transform.ts: unsupportedParts() — checks if model rejects image input */
function wouldRejectImageInput(capabilities: Capabilities): boolean {
  return !capabilities.input.image;
}

/** OpenCode provider.ts: parseModelRef() — "planId/modelId" format */
function parseModelRef(ref: string): { provider: string; model: string } | null {
  const slash = ref.indexOf('/');
  if (slash === -1) return null;
  return { provider: ref.substring(0, slash), model: ref.substring(slash + 1) };
}

/** OpenCode: validate provider structure has required fields */
function validateProviderStructure(provider: any): string[] {
  const errors: string[] = [];
  if (!provider.npm) errors.push('missing npm field');
  if (!provider.name) errors.push('missing name field');
  if (!provider.options?.baseURL) errors.push('missing options.baseURL');
  if (typeof provider.models !== 'object') errors.push('models should be an object');
  return errors;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('OpenCode Consumer Simulation', () => {
  let integration: OpenCodeIntegration;

  beforeEach(() => {
    mockFs = createMockFs();
    integration = new OpenCodeIntegration();
  });

  describe('Provider structure validation', () => {
    it('should produce valid provider consumable by OpenCode', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const provider = config.provider['ssy_cp_lite'];

      const errors = validateProviderStructure(provider);
      expect(errors, `Provider validation errors: ${errors.join(', ')}`).toEqual([]);
    });

    it('should use @ai-sdk/openai-compatible npm package', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;

      expect(config.provider['ssy_cp_lite'].npm).toBe('@ai-sdk/openai-compatible');
    });

    it('apiKey in options should be passthrough for Authorization header', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;

      // OpenCode @ai-sdk/openai-compatible passes options.apiKey as Bearer token
      const apiKey = config.provider['ssy_cp_lite'].options.apiKey;
      expect(apiKey).toBe(API_KEY);
      expect(apiKey).not.toContain('Bearer'); // SDK adds Bearer prefix itself
    });
  });

  describe('Model ref format (planId/modelId)', () => {
    it('should produce parseable model ref', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY, 'kimi-k2.5');
      const config = mockFs._readJson(CONFIG_PATH) as any;

      const parsed = parseModelRef(config.model);
      expect(parsed).not.toBeNull();
      expect(parsed!.provider).toBe('ssy_cp_lite');
      expect(parsed!.model).toBe('kimi-k2.5');
    });

    it('provider in model ref should match a configured provider key', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;

      const parsed = parseModelRef(config.model);
      expect(config.provider[parsed!.provider]).toBeDefined();
    });

    it('model in model ref should exist in provider models map', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY, 'glm-4.7');
      const config = mockFs._readJson(CONFIG_PATH) as any;

      const parsed = parseModelRef(config.model);
      const providerModels = config.provider[parsed!.provider].models;
      expect(providerModels[parsed!.model]).toBeDefined();
    });
  });

  describe('Modalities validation', () => {
    it('all modalities should pass OpenCode zod schema', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.provider['ssy_cp_lite'].models;

      for (const [id, model] of Object.entries(models) as [string, any][]) {
        expect(
          validateOpenCodeModalities(model.modalities),
          `${id}: modalities ${JSON.stringify(model.modalities)} should pass zod`,
        ).toBe(true);
      }
    });

    it('Pro Plan modalities should also pass schema', () => {
      integration.loadPlanConfig(BYTEPLUS, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.provider['ssy_cp_pro'].models;

      for (const [id, model] of Object.entries(models) as [string, any][]) {
        expect(
          validateOpenCodeModalities(model.modalities),
          `${id}: modalities should pass zod`,
        ).toBe(true);
      }
    });
  });

  describe('Capabilities mapping (modalities → capabilities)', () => {
    it('image-capable model should produce capabilities.input.image=true', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const arkCode = config.provider['ssy_cp_lite'].models['anthropic/claude-sonnet-4.6'];

      const caps = mapModalitiesToCapabilities(arkCode.modalities);
      expect(caps.input.text).toBe(true);
      expect(caps.input.image).toBe(true);
      expect(caps.input.audio).toBe(false);
      expect(caps.output.text).toBe(true);
    });

    it('text-only model should produce capabilities.input.image=false', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const glm = config.provider['ssy_cp_lite'].models['glm-4.7'];

      const caps = mapModalitiesToCapabilities(glm.modalities);
      expect(caps.input.text).toBe(true);
      expect(caps.input.image).toBe(false);
    });

    it('model without modalities should default to text-only', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const deepseek = config.provider['ssy_cp_lite'].models['deepseek-v3.2'];

      const caps = mapModalitiesToCapabilities(deepseek.modalities);
      expect(caps.input.text).toBe(true);
      expect(caps.input.image).toBe(false);
      expect(caps.input.audio).toBe(false);
    });
  });

  describe('Image message handling (unsupportedParts simulation)', () => {
    it('image-capable model should NOT reject image messages', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;

      const modelsWithImage = ['anthropic/claude-sonnet-4.6', 'doubao-seed-code', 'kimi-k2.5'];
      for (const id of modelsWithImage) {
        const model = config.provider['ssy_cp_lite'].models[id];
        if (!model) continue;
        const caps = mapModalitiesToCapabilities(model.modalities);
        expect(
          wouldRejectImageInput(caps),
          `${id} should accept image input`,
        ).toBe(false);
      }
    });

    it('text-only model should reject image messages', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;

      const textOnlyModels = ['glm-4.7', 'deepseek-v3.2'];
      for (const id of textOnlyModels) {
        const model = config.provider['ssy_cp_lite'].models[id];
        if (!model) continue;
        const caps = mapModalitiesToCapabilities(model.modalities);
        expect(
          wouldRejectImageInput(caps),
          `${id} should reject image input`,
        ).toBe(true);
      }
    });

    it('all Pro Plan models should reject image messages', () => {
      integration.loadPlanConfig(BYTEPLUS, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;

      for (const [id, model] of Object.entries(config.provider['ssy_cp_pro'].models) as [string, any][]) {
        const caps = mapModalitiesToCapabilities(model.modalities);
        expect(
          wouldRejectImageInput(caps),
          `Pro Plan ${id} should reject image input`,
        ).toBe(true);
      }
    });
  });

  describe('Model limit fields', () => {
    it('all models should have positive context and output limits', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
      const config = mockFs._readJson(CONFIG_PATH) as any;
      const models = config.provider['ssy_cp_lite'].models;

      for (const [id, model] of Object.entries(models) as [string, any][]) {
        expect(model.limit, `${id} should have limit`).toBeDefined();
        expect(model.limit.context, `${id} context`).toBeGreaterThan(0);
        expect(model.limit.output, `${id} output`).toBeGreaterThan(0);
      }
    });
  });

  describe('Cross-plan consistency', () => {
    it('same model in different plans should use correct plan-specific modalities', () => {
      integration.loadPlanConfig(VOLCANO, 'key-1');
      integration.loadPlanConfig(BYTEPLUS, 'key-2');

      const config = mockFs._readJson(CONFIG_PATH) as any;

      // ark-code-latest: Volcano has image, Pro Plan doesn't
      const volcArkCode = config.provider['ssy_cp_lite'].models['anthropic/claude-sonnet-4.6'];
      const bpArkCode = config.provider['ssy_cp_pro'].models['anthropic/claude-sonnet-4.6'];

      const volcCaps = mapModalitiesToCapabilities(volcArkCode.modalities);
      const bpCaps = mapModalitiesToCapabilities(bpArkCode.modalities);

      expect(volcCaps.input.image).toBe(true);
      expect(bpCaps.input.image).toBe(false);
    });
  });
});
