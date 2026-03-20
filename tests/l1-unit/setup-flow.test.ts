import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks (hoisted before imports) ──────────────────────────────

vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => { throw new Error('ENOENT'); }),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('figlet', () => ({
  default: { textSync: vi.fn(() => 'CODING HELPER') },
}));

vi.mock('gradient-string', () => {
  const createGradient = vi.fn(() => {
    const fn = ((s: string) => s) as any;
    fn.multiline = (s: string) => s;
    return fn;
  });
  return { default: createGradient };
});

vi.mock('ora', () => {
  const spinner = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  };
  return { default: vi.fn(() => spinner) };
});

vi.mock('terminal-link', () => ({
  default: vi.fn((text: string) => text),
}));

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  password: vi.fn(),
  confirm: vi.fn(),
  input: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawnSync: vi.fn(),
  spawn: vi.fn(() => ({ unref: vi.fn() })),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { logError: vi.fn() },
}));

vi.mock('../../src/lib/tea-tracker.js', () => ({
  track: vi.fn(),
  trackToolEvent: vi.fn(),
}));

// ── Import under test ───────────────────────────────────────────

import { SetupFlow } from '../../src/lib/setup-flow.js';

// ── Tests ───────────────────────────────────────────────────────

describe('SetupFlow.runFirstTimeSetup', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let clearSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    clearSpy = vi.spyOn(console, 'clear').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    clearSpy.mockRestore();
  });

  it('should execute in order: configLanguage → configPlan → selectAndConfigureTool', async () => {
    const flow = new SetupFlow();
    const callOrder: string[] = [];

    vi.spyOn(flow as any, 'resetScreen').mockImplementation(() => {});
    vi.spyOn(flow as any, 'configLanguage').mockImplementation(async () => {
      callOrder.push('configLanguage');
    });
    vi.spyOn(flow as any, 'configPlan').mockImplementation(async () => {
      callOrder.push('configPlan');
    });
    vi.spyOn(flow as any, 'selectAndConfigureTool').mockImplementation(async () => {
      callOrder.push('selectAndConfigureTool');
    });

    await flow.runFirstTimeSetup();

    expect(callOrder).toEqual(['configLanguage', 'configPlan', 'selectAndConfigureTool']);
  });

  it('configLanguage should be the first step (not the last)', async () => {
    const flow = new SetupFlow();
    const callOrder: string[] = [];

    vi.spyOn(flow as any, 'resetScreen').mockImplementation(() => {});
    vi.spyOn(flow as any, 'configLanguage').mockImplementation(async () => {
      callOrder.push('configLanguage');
    });
    vi.spyOn(flow as any, 'configPlan').mockImplementation(async () => {
      callOrder.push('configPlan');
    });
    vi.spyOn(flow as any, 'selectAndConfigureTool').mockImplementation(async () => {
      callOrder.push('selectAndConfigureTool');
    });

    await flow.runFirstTimeSetup();

    expect(callOrder[0]).toBe('configLanguage');
    expect(callOrder[callOrder.length - 1]).not.toBe('configLanguage');
  });
});
