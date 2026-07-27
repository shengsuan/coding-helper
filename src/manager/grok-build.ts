import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import * as toml from '@iarna/toml';
import { type Plan } from '../lib/constants.js';
import { logger } from '../utils/logger.js';

interface GrokModelEntry {
  api_key?: string;
  model?: string;
  base_url?: string;
}

interface GrokConfig {
  endpoints?: {
    models_base_url?: string;
  };
  model?: Record<string, GrokModelEntry>;
  models?: {
    default?: string;
  };
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

export class GrokBuildManager {
  private configPath = join(homedir(), '.grok', 'config.toml');
  private providerKey = 'shengsuanyun';

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  getConfig(): GrokConfig | null {
    try {
      if (!existsSync(this.configPath)) return null;
      const content = readFileSync(this.configPath, 'utf-8');
      return toml.parse(content) as unknown as GrokConfig;
    } catch (error) {
      logger.logError('GrokBuildManager.getConfig', error);
      return null;
    }
  }

  private saveConfig(config: GrokConfig): void {
    this.ensureDir(this.configPath);
    const tomlContent = toml.stringify(config as any);
    writeFileSync(this.configPath, tomlContent, 'utf-8');
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    const currentConfig = this.getConfig() || {};
    const targetModel = model || 'anthropic/claude-sonnet-5';

    currentConfig.endpoints = {
      ...currentConfig.endpoints,
      models_base_url: plan.baseUrl,
    };

    if (!currentConfig.model) {
      currentConfig.model = {};
    }

    currentConfig.model[this.providerKey] = {
      api_key: apiKey,
      model: targetModel,
      base_url: plan.baseUrl,
    };

    currentConfig.models = {
      ...currentConfig.models,
      default: this.providerKey,
    };

    this.saveConfig(currentConfig);
  }

  unloadPlanConfig(): void {
    const currentConfig = this.getConfig();
    if (!currentConfig?.model?.[this.providerKey]) return;

    delete currentConfig.model[this.providerKey];
    if (Object.keys(currentConfig.model).length === 0) {
      delete currentConfig.model;
    }

    if (currentConfig.models?.default === this.providerKey) {
      delete currentConfig.models.default;
      if (Object.keys(currentConfig.models).length === 0) {
        delete currentConfig.models;
      }
    }

    if (currentConfig.endpoints?.models_base_url?.includes('router.shengsuanyun.com')) {
      delete currentConfig.endpoints.models_base_url;
      if (Object.keys(currentConfig.endpoints).length === 0) {
        delete currentConfig.endpoints;
      }
    }

    this.saveConfig(currentConfig);
  }

  detectCurrentConfig(): DetectedConfig {
    const currentConfig = this.getConfig();
    const currentModel = currentConfig?.model?.[this.providerKey];

    const baseUrl = currentConfig?.endpoints?.models_base_url || currentModel?.base_url;

    if (!baseUrl || currentConfig?.models?.default !== this.providerKey) {
      return { plan: null, apiKey: null };
    }

    if (baseUrl.includes('/api/cp')) {
      return { plan: 'ssy_cp_pro', apiKey: currentModel?.api_key || null };
    }

    return { plan: 'pay_as_you_go', apiKey: currentModel?.api_key || null };
  }
}

export const grokBuildManager = new GrokBuildManager();
