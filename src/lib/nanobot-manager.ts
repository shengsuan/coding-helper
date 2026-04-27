import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { type Plan } from './constants.js';
import { logger } from '../utils/logger.js';
import { validateModelSupport } from './model-selector.js';
import { getModels } from './models.js';

interface NanobotProviderConfig {
  apiKey: string;
  apiBase?: string | null;
  extraHeaders?: Record<string, string> | null;
}

interface NanobotAgentDefaults {
  workspace?: string;
  model?: string;
  provider?: string;
  maxTokens?: number;
  temperature?: number;
  maxToolIterations?: number;
  memoryWindow?: number;
}

interface NanobotConfig {
  agents?: {
    defaults?: NanobotAgentDefaults;
  };
  providers?: Record<string, NanobotProviderConfig>;
  [key: string]: unknown;
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

/** 老版 nanobot 不支持添加系统未预置的 provider，只能使用内置的 "custom" 槽位 */
const LEGACY_PROVIDER_NAME = 'custom';

interface NanobotPlanMapping {
  /** 新版 nanobot 官方 provider 名（nanobot 初始化时会自动预置） */
  providerName: string;
  /** agents.defaults.provider 使用的 snake_case 名称 */
  agentProvider: string;
  apiBase: string;
}

const PLAN_TO_NANOBOT: Record<string, NanobotPlanMapping> = {
  "ssy_cp_lite": {
    providerName: 'volcengineCodingPlan',
    agentProvider: 'volcengine_coding_plan',
    apiBase: 'https://router.shengsuanyun.com/api/cp/v1'
  },
  "ssy_cp_pro": {
    providerName: 'byteplusCodingPlan',
    agentProvider: 'byteplus_coding_plan',
    apiBase: 'https://router.shengsuanyun.com/api/cp/v1'
  }
};

export class NanobotManager {
  private configPath = join(homedir(), '.nanobot', 'config.json');

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  getConfig(): NanobotConfig | null {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to read Nanobot config:', error);
      logger.logError('NanobotManager.getConfig', error);
    }
    return null;
  }

  private saveConfig(config: NanobotConfig): void {
    try {
      this.ensureDir(this.configPath);
      writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save Nanobot config: ${error}`);
    }
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    const mapping = PLAN_TO_NANOBOT[plan.id];
    if (!mapping) {
      throw new Error(`Unsupported plan for Nanobot: ${plan.id}`);
    }

    const currentConfig = this.getConfig() || {};
    const existingProviders = currentConfig.providers || {};

    const isNewNanobot = Object.values(PLAN_TO_NANOBOT).some(
      m => m.providerName in existingProviders
    );
    const activeProviderName = isNewNanobot ? mapping.providerName : LEGACY_PROVIDER_NAME;
    const obsoleteProviderName = isNewNanobot ? LEGACY_PROVIDER_NAME : mapping.providerName;

    const updatedProviders = { ...existingProviders };
    delete updatedProviders[obsoleteProviderName];
    updatedProviders[activeProviderName] = { apiKey, apiBase: mapping.apiBase };

    const models = await getModels(plan.id);
    const selectedModel = validateModelSupport(
      models,
      model || models[0]?.id,
      ["/v1/chat/completions"],
      "nanobot"
    );
    const nanobotModel = selectedModel;
    const nanobotProvider = isNewNanobot ? mapping.agentProvider : LEGACY_PROVIDER_NAME;

    const newConfig: NanobotConfig = {
      ...currentConfig,
      agents: {
        ...(currentConfig.agents || {}),
        defaults: {
          ...(currentConfig.agents?.defaults || {}),
          model: nanobotModel,
          provider: nanobotProvider
        }
      },
      providers: updatedProviders
    };

    this.saveConfig(newConfig);
  }

  unloadPlanConfig(planId?: string): void {
    const currentConfig = this.getConfig();
    if (!currentConfig) return;

    const allProviderNames = new Set([
      ...Object.values(PLAN_TO_NANOBOT).map(m => m.providerName),
      ...Object.values(PLAN_TO_NANOBOT).map(m => m.agentProvider),
      LEGACY_PROVIDER_NAME
    ]);

    const mappingsToRemove = planId
      ? [PLAN_TO_NANOBOT[planId]].filter(Boolean)
      : Object.values(PLAN_TO_NANOBOT);

    for (const mapping of mappingsToRemove) {
      const entry = currentConfig.providers?.[mapping.providerName];
      if (entry) {
        // 新版 nanobot 的系统预置 provider 保留条目结构，只清空 apiKey/apiBase
        // 避免删除后下次误判为老版 nanobot
        entry.apiKey = '';
        entry.apiBase = null;
      }
    }
    // 老版 nanobot 的 custom 槽位是我们自己写入的，直接删除
    if (currentConfig.providers?.[LEGACY_PROVIDER_NAME]) {
      delete currentConfig.providers[LEGACY_PROVIDER_NAME];
    }

    // 清理 agents.defaults.model 和 provider 字段
    const defaults = currentConfig.agents?.defaults;
    if (defaults) {
      // 新版 nanobot：provider 为 snake_case（如 "volcengine_coding_plan"），model 无前缀
      // 老版 nanobot：provider 为 "custom"，model 无前缀
      if (defaults.provider && allProviderNames.has(defaults.provider)) {
        delete defaults.model;
        delete defaults.provider;
      }
    }

    this.saveConfig(currentConfig);
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const config = this.getConfig();
      if (!config?.providers) {
        return { plan: null, apiKey: null };
      }

      // Prefer the plan that agents.defaults.provider points to
      const defaultProvider = config.agents?.defaults?.provider;
      if (defaultProvider) {
        for (const [planId, mapping] of Object.entries(PLAN_TO_NANOBOT)) {
          if (mapping.agentProvider === defaultProvider || mapping.providerName === defaultProvider) {
            const provider = config.providers[mapping.providerName];
            if (provider?.apiKey) {
              return { plan: planId, apiKey: provider.apiKey };
            }
          }
        }
      }

      // Fallback: return the first configured plan with an apiKey
      for (const [planId, mapping] of Object.entries(PLAN_TO_NANOBOT)) {
        const provider = config.providers[mapping.providerName];
        if (provider?.apiKey) {
          return { plan: planId, apiKey: provider.apiKey };
        }
      }
      // 老版 nanobot：从 custom 槽位读取，通过 apiBase 反推 plan
      const customProvider = config.providers[LEGACY_PROVIDER_NAME];
      if (customProvider?.apiKey) {
        const planId = Object.entries(PLAN_TO_NANOBOT).find(
          ([, m]) => customProvider.apiBase === m.apiBase
        )?.[0] ?? null;
        return { plan: planId, apiKey: customProvider.apiKey };
      }

      return { plan: null, apiKey: null };
    } catch {
      return { plan: null, apiKey: null };
    }
  }
}

export const nanobotManager = new NanobotManager();
