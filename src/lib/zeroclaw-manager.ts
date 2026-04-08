import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import * as toml from '@iarna/toml';
import { PLANS, type Plan } from './constants.js';
import { logger } from '../utils/logger.js';
import { validateModelSupport } from './model-selector.js';

interface ZeroClawConfig {
  api_key?: string;
  default_provider?: string;
  default_model?: string;
  default_temperature?: number;
  model_routes?: unknown[];
  embedding_routes?: unknown[];
  provider?: Record<string, unknown>;
  agents?: Record<string, unknown>;
  model_providers?: Record<string, unknown>;
  [key: string]: unknown;
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

const PLAN_TO_ZEROCLAW: Record<string, { apiBase: string }> = {
  "ssy_cp_lite": { apiBase: 'https://router.shengsuanyun.com/api/cp/v1' },
  "ssy_cp_pro": { apiBase: 'https://router.shengsuanyun.com/api/cp/v1' }
};

const PLAN_TO_LEGACY_PROFILE: Record<string, string> = {
  "ssy_cp_lite": 'volcengine-coding-plan',
  "ssy_cp_pro": 'byteplus-coding-plan'
};

export class ZeroClawManager {
  private configPath = join(homedir(), '.zeroclaw', 'config.toml');

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  getConfig(): ZeroClawConfig | null {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, 'utf-8');
        return toml.parse(content) as unknown as ZeroClawConfig;
      }
    } catch (error) {
      console.warn('Failed to read ZeroClaw config:', error);
      logger.logError('ZeroClawManager.getConfig', error);
    }
    return null;
  }

  private saveConfig(config: ZeroClawConfig): void {
    try {
      this.ensureDir(this.configPath);
      const tomlContent = toml.stringify(config as any);
      writeFileSync(this.configPath, tomlContent, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save ZeroClaw config: ${error}`);
    }
  }

  isOnboarded(): boolean {
    return existsSync(this.configPath);
  }

  private detectPlanByApiBase(apiBase: string): string | null {
    return (
      Object.entries(PLAN_TO_ZEROCLAW).find(([, mapping]) => mapping.apiBase === apiBase)?.[0] ??
      null
    );
  }

  private getLegacyModelProviderApiKey(config: ZeroClawConfig, profileName: string): string | null {
    const provider = config.model_providers?.[profileName];
    if (!provider || typeof provider !== 'object') return null;
    const apiKey = (provider as { api_key?: unknown }).api_key;
    return typeof apiKey === 'string' && apiKey ? apiKey : null;
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    if (!this.isOnboarded()) {
      throw new Error(
        'ZeroClaw 尚未初始化，请先运行 `zeroclaw onboard` 完成安装后再配置。'
      );
    }

    const mapping = PLAN_TO_ZEROCLAW[plan.id];
    if (!mapping) {
      throw new Error(`Unsupported plan for ZeroClaw: ${plan.id}`);
    }

    const currentConfig = this.getConfig() || {};
    const models = await plan.getModels || plan.models;
    const selectedModel = validateModelSupport(
      models,
      model || plan.models[0]?.id,
      ["/v1/chat/completions"],
      "zeroclaw"
    );

    // 清理旧版 model_providers 遗留条目
    if (currentConfig.model_providers) {
      for (const key of Object.keys(currentConfig.model_providers)) {
        if (
          Object.values(PLAN_TO_ZEROCLAW).some(m => key.includes(m.apiBase)) ||
          key === 'volcengine-coding-plan' ||
          key === 'byteplus-coding-plan'
        ) {
          delete currentConfig.model_providers[key];
        }
      }
    }

    const newConfig: ZeroClawConfig = {
      ...currentConfig,
      api_key: apiKey,
      default_provider: `custom:${mapping.apiBase}`,
      default_model: selectedModel
    };

    this.saveConfig(newConfig);
  }

  unloadPlanConfig(planId?: string): void {
    const currentConfig = this.getConfig();
    if (!currentConfig) return;

    let changed = false;
    const targetPlanIds = planId
      ? [planId]
      : Object.keys(PLAN_TO_ZEROCLAW);

    if (currentConfig.default_provider?.startsWith('custom:')) {
      const providerUrl = currentConfig.default_provider.slice('custom:'.length);
      const currentPlanId = this.detectPlanByApiBase(providerUrl);
      const shouldClearDefault = !currentPlanId || targetPlanIds.includes(currentPlanId);
      if (shouldClearDefault) {
        delete currentConfig.default_provider;
        delete currentConfig.default_model;
        delete currentConfig.api_key;
        changed = true;
      }
    }

    for (const targetPlanId of targetPlanIds) {
      const legacyProfile = PLAN_TO_LEGACY_PROFILE[targetPlanId];
      if (!legacyProfile) continue;
      if (currentConfig.default_provider === legacyProfile) {
        delete currentConfig.default_provider;
        delete currentConfig.default_model;
        changed = true;
      }
      if (currentConfig.model_providers?.[legacyProfile]) {
        delete currentConfig.model_providers[legacyProfile];
        changed = true;
      }
    }

    if (changed) {
      this.saveConfig(currentConfig);
    }
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const config = this.getConfig();
      if (!config) {
        return { plan: null, apiKey: null };
      }

      if (config.default_provider?.startsWith('custom:')) {
        const providerUrl = config.default_provider.slice('custom:'.length);
        const planId = this.detectPlanByApiBase(providerUrl);
        return {
          plan: planId,
          apiKey: config.api_key || null
        };
      }

      for (const [planId, legacyProfile] of Object.entries(PLAN_TO_LEGACY_PROFILE)) {
        if (config.default_provider === legacyProfile) {
          return {
            plan: planId,
            apiKey: this.getLegacyModelProviderApiKey(config, legacyProfile)
          };
        }
      }

      for (const [planId, legacyProfile] of Object.entries(PLAN_TO_LEGACY_PROFILE)) {
        const apiKey = this.getLegacyModelProviderApiKey(config, legacyProfile);
        if (apiKey) {
          return { plan: planId, apiKey };
        }
      }

      return { plan: null, apiKey: null };
    } catch {
      return { plan: null, apiKey: null };
    }
  }

  getProviderModels(planId: string): string[] {
    return PLANS[planId]?.models.map(m => m.id) || [];
  }
}

export const zeroClawManager = new ZeroClawManager();
