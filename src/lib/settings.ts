import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { CONFIG_DIR, CONFIG_PATH, PLANS } from './constants.js';
import { logger } from '../utils/logger.js';

export interface PlanConfig {
  api_key?: string;
  model?: string;
  label?: string;
  baseUrl?: string;
  apiKeyName?: string;
}

export interface Config {
  lang: string;
  plans: {
    [key: string]: PlanConfig;
  };
}
const DEFAULT_CONFIG: Config = { lang: 'zh_CN', plans: {} };

export class Settings {
  private config: Config;

  constructor() {
    this.config = this.loadConfig();
  }

  private ensureConfigDir(): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  private loadConfig(): Config {
    try {
      if (existsSync(CONFIG_PATH)) {
        const fileContent = readFileSync(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent) as unknown;
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_CONFIG, ...(parsed as Partial<Config>) };
        }
      }
    } catch (error) {
      logger.logError('Settings.loadConfig', error);
    }
    return { ...DEFAULT_CONFIG };
  }

  private saveConfig(): void {
    try {
      this.ensureConfigDir();
      this.patchConfig();
      writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      logger.logError('Settings.saveConfig', error);
      throw error;
    }
  }

  getConfig(): Config {
    return structuredClone(this.config);
  }

  patchConfig(): void {
    for (const [planId, plan] of Object.entries(this.config.plans)) {
      if (!(planId in PLANS)) {
        continue;
      }
      if (!plan.label) {
        plan.label = PLANS[planId].name_zh || PLANS[planId].name;
      }
      if (!plan.baseUrl) {
        plan.baseUrl = PLANS[planId].baseUrl;
      }
      if (!plan.apiKeyName) {
        plan.apiKeyName = PLANS[planId].apiKeyName;
      }
    }
  }

  updateConfig(updates: Partial<Config>): void {
    this.config = {
      ...this.config,
      ...updates,
      plans: {
        ...this.config.plans,
        ...(updates.plans ?? {}),
      },
    };
    this.saveConfig();
  }

  isFirstRun(): boolean {
    return !existsSync(CONFIG_PATH);
  }

  getLang(): string {
    return this.config.lang || DEFAULT_CONFIG.lang;
  }

  setLang(lang: string): void {
    this.config.lang = lang;
    this.saveConfig();
  }

  getPlanConfig(planId: string): PlanConfig | undefined {
    return this.config.plans[planId];
  }

  private ensurePlan(planId: string): PlanConfig {
    if (!this.config.plans[planId]) {
      this.config.plans[planId] = {};
    }
    return this.config.plans[planId];
  }

  setApiKey(planId: string, apiKey: string): void {
    this.ensurePlan(planId).api_key = apiKey;
    this.saveConfig();
  }

  setModel(planId: string, model: string): void {
    this.ensurePlan(planId).model = model;
    this.saveConfig();
  }

  getApiKey(planId: string): string | undefined {
    return this.config.plans[planId]?.api_key;
  }

  getModel(planId: string): string | undefined {
    return this.config.plans[planId]?.model;
  }

  revokeApiKey(planId: string): void {
    const plan = this.config.plans[planId];
    if (plan) {
      delete plan.api_key;
      this.saveConfig();
    }
  }

  hasAnyConfig(): boolean {
    return Object.values(this.config.plans).some((plan) => !!plan?.api_key);
  }
}

export const settings = new Settings();
