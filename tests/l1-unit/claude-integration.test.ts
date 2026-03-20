import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFs, type MockFs } from '../helpers/mock-fs.js';
import { join } from 'path';
import { homedir } from 'os';

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');
const MCP_PATH = join(homedir(), '.claude.json');

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

import { ClaudeIntegration } from '../../src/lib/claude-integration.js';
import { PLANS } from '../../src/lib/constants.js';

const VOLCANO = PLANS['cp_test_lite'];
const BYTEPLUS = PLANS['cp_test_pro'];
const API_KEY = 'test-api-key-12345';

describe('ClaudeIntegration', () => {
  let integration: ClaudeIntegration;

  beforeEach(() => {
    mockFs = createMockFs();
    integration = new ClaudeIntegration();
    // Prevent purgeConflictingEnvVars from running
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
  });

  // ─── loadPlanConfig ───────────────────────────────────────────

  describe('loadPlanConfig', () => {
    it('should write settings.json with correct env vars', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const settings = mockFs._readJson(SETTINGS_PATH) as any;
      expect(settings.env.ANTHROPIC_AUTH_TOKEN).toBe(API_KEY);
      expect(settings.env.ANTHROPIC_BASE_URL).toBe(VOLCANO.anthropicBaseUrl);
      expect(settings.env.ANTHROPIC_MODEL).toBe('doubao-seed-code'); // default
      expect(settings.env.API_TIMEOUT_MS).toBe('3000000');
      expect(settings.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe(1);
    });

    it('should use specified model', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY, 'kimi-k2.5');

      const settings = mockFs._readJson(SETTINGS_PATH) as any;
      expect(settings.env.ANTHROPIC_MODEL).toBe('kimi-k2.5');
    });

    it('should use Anthropic-compatible endpoint (not OpenAI)', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const settings = mockFs._readJson(SETTINGS_PATH) as any;
      expect(settings.env.ANTHROPIC_BASE_URL).toBe(VOLCANO.anthropicBaseUrl);
      expect(settings.env.ANTHROPIC_BASE_URL).toContain('/api/coding');
      expect(settings.env.ANTHROPIC_BASE_URL).not.toContain('/api/coding/v3');
    });

    it('should remove legacy ANTHROPIC_API_KEY if present', () => {
      mockFs._seed(SETTINGS_PATH, JSON.stringify({
        env: { ANTHROPIC_API_KEY: 'old-key', OTHER_VAR: 'keep' },
      }));

      integration.loadPlanConfig(VOLCANO, API_KEY);

      const settings = mockFs._readJson(SETTINGS_PATH) as any;
      expect(settings.env.ANTHROPIC_API_KEY).toBeUndefined();
      expect(settings.env.ANTHROPIC_AUTH_TOKEN).toBe(API_KEY);
      expect(settings.env.OTHER_VAR).toBe('keep');
    });

    it('should set hasCompletedOnboarding in ~/.claude.json', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const mcp = mockFs._readJson(MCP_PATH) as any;
      expect(mcp.hasCompletedOnboarding).toBe(true);
    });

    it('should preserve existing MCP config', () => {
      mockFs._seed(MCP_PATH, JSON.stringify({
        mcpServers: { 'my-server': { type: 'stdio', command: 'node' } },
      }));

      integration.loadPlanConfig(VOLCANO, API_KEY);

      const mcp = mockFs._readJson(MCP_PATH) as any;
      expect(mcp.hasCompletedOnboarding).toBe(true);
      expect(mcp.mcpServers['my-server']).toBeDefined();
    });

    it('should merge with existing settings', () => {
      mockFs._seed(SETTINGS_PATH, JSON.stringify({
        permissions: { allow: ['Bash'] },
        env: { MY_CUSTOM_VAR: 'hello' },
      }));

      integration.loadPlanConfig(VOLCANO, API_KEY);

      const settings = mockFs._readJson(SETTINGS_PATH) as any;
      expect(settings.permissions.allow).toContain('Bash');
      expect(settings.env.MY_CUSTOM_VAR).toBe('hello');
      expect(settings.env.ANTHROPIC_AUTH_TOKEN).toBe(API_KEY);
    });
  });

  // ─── unloadPlanConfig ─────────────────────────────────────────

  describe('unloadPlanConfig', () => {
    beforeEach(() => {
      integration.loadPlanConfig(VOLCANO, API_KEY);
    });

    it('should remove all managed env vars', () => {
      integration.unloadPlanConfig();

      const settings = mockFs._readJson(SETTINGS_PATH) as any;
      expect(settings.env?.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
      expect(settings.env?.ANTHROPIC_BASE_URL).toBeUndefined();
      expect(settings.env?.ANTHROPIC_MODEL).toBeUndefined();
      expect(settings.env?.API_TIMEOUT_MS).toBeUndefined();
      expect(settings.env?.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBeUndefined();
    });

    it('should remove env key when empty', () => {
      integration.unloadPlanConfig();

      const settings = mockFs._readJson(SETTINGS_PATH) as any;
      expect(settings.env).toBeUndefined();
    });

    it('should preserve non-managed env vars', () => {
      // Add a custom var
      const settings = mockFs._readJson(SETTINGS_PATH) as any;
      settings.env.MY_CUSTOM = 'keep';
      mockFs._seed(SETTINGS_PATH, JSON.stringify(settings));

      integration.unloadPlanConfig();

      const after = mockFs._readJson(SETTINGS_PATH) as any;
      expect(after.env.MY_CUSTOM).toBe('keep');
    });
  });

  // ─── detectCurrentConfig ──────────────────────────────────────

  describe('detectCurrentConfig', () => {
    it('should return null when no config exists', () => {
      const result = integration.detectCurrentConfig();
      expect(result).toEqual({ plan: null, apiKey: null });
    });

    it('should detect Volcano plan from base URL', () => {
      integration.loadPlanConfig(VOLCANO, API_KEY);

      const result = integration.detectCurrentConfig();
      expect(result.plan).toBe('cp_test_lite');
      expect(result.apiKey).toBe(API_KEY);
    });

    it('should detect Pro Plan plan', () => {
      integration.loadPlanConfig(BYTEPLUS, API_KEY);

      const result = integration.detectCurrentConfig();
      expect(result.plan).toBe('cp_test_pro');
      expect(result.apiKey).toBe(API_KEY);
    });
  });

  // ─── MCP management ──────────────────────────────────────────

  describe('MCP management', () => {
    it('should install and detect MCP server', () => {
      integration.installMCP('test-server', {
        type: 'stdio',
        command: 'node',
        args: ['server.js'],
      });

      expect(integration.isMCPInstalled('test-server')).toBe(true);
      expect(integration.getInstalledMCPs()).toContain('test-server');
    });

    it('should uninstall MCP server', () => {
      integration.installMCP('test-server', { type: 'stdio', command: 'node' });
      integration.uninstallMCP('test-server');

      expect(integration.isMCPInstalled('test-server')).toBe(false);
    });
  });
});
