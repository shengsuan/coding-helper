import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { validateModelSupport } from '../lib/model-selector.js';
import { type Plan, Model } from '../lib/constants.js';
import { getModels } from '../lib/models.js';
import { logger } from '../utils/logger.js';
import { dirname, join } from 'path';
import * as toml from '@iarna/toml';
import { homedir } from 'os';

interface DeepSeekConfig {
  api_key?: string;
  base_url?: string;
  default_text_model?: string;
  ssy_code_plan?: string;
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

export class DeepSeekModelError extends Error {
  constructor(
    message: string,
    public availableModels: Model[]
  ) {
    super(message);
    this.name = 'DeepSeekModelError';
  }
}

export class DeepSeekManager {
  private configPath = join(homedir(), '.deepseek', 'config.toml');

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private filterDeepSeekModels(models: Model[]): Model[] {
    return models.filter(model => model.id.includes('/deepseek'));
  }

  getConfig(): DeepSeekConfig | null {
    try {
      if (!existsSync(this.configPath)) return null;
      const content = readFileSync(this.configPath, 'utf-8');
      return toml.parse(content) as unknown as DeepSeekConfig;
    } catch (error) {
      logger.logError('DeepSeekManager.getConfig', error);
      return null;
    }
  }

  private saveConfig(config: DeepSeekConfig): void {
    try {
      this.ensureDir(this.configPath);
      const tomlContent = toml.stringify(config as any);
      writeFileSync(this.configPath, tomlContent, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save DeepSeek config: ${error}`);
    }
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    const allModels = await getModels(plan.id);
    const compatibleModels = this.filterDeepSeekModels(allModels);

    if (compatibleModels.length === 0) {
      throw new DeepSeekModelError(
        '当前计划没有符合 DeepSeek 要求的模型（需包含 /deepseek）',
        []
      );
    }

    const targetModel = model || compatibleModels[0]?.id;

    if (!targetModel.includes('/deepseek')) {
      throw new DeepSeekModelError(
        `模型 ${targetModel} 不符合 DeepSeek 要求（需包含 /deepseek）`,
        compatibleModels
      );
    }

    const selectedModel = validateModelSupport(
      compatibleModels,
      targetModel,
      ['/v1/chat/completions'],
      'deepseek'
    );

    const config = this.getConfig() || {};
    config.api_key = apiKey;
    config.base_url = plan.baseUrl;
    config.default_text_model = selectedModel;
    config.ssy_code_plan = plan.id;
    this.saveConfig(config);
  }

  unloadPlanConfig(): void {
    const config = this.getConfig();
    if (!config?.ssy_code_plan) return;

    delete config.api_key;
    delete config.base_url;
    delete config.ssy_code_plan;
    config.default_text_model = 'deepseek-v4-pro';
    this.saveConfig(config);
  }

  detectCurrentConfig(): DetectedConfig {
    const config = this.getConfig();
    if (!config?.ssy_code_plan) {
      return { plan: null, apiKey: null };
    }
    return {
      plan: config.ssy_code_plan,
      apiKey: config.api_key || null
    };
  }
}

export const deepSeekManager = new DeepSeekManager();
