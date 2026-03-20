import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { CONFIG_DIR, CONFIG_PATH } from './constants.js';
import * as yaml from 'js-yaml';
import { logger } from '../utils/logger.js';

export interface PlanConfig {
  api_key?: string;
  model?: string;
}

export interface Config {
  lang: string;
  plans: {
    "cp_test_lite"?: PlanConfig;
    "cp_test_pro"?: PlanConfig;
    "cp_test_enterprise"?: PlanConfig;
    "pay_as_you_go"?: PlanConfig;
  };
}

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
        const config = yaml.load(fileContent) as Config;
        return config || { lang: 'zh_CN', plans: {} };
      }
    } catch (error) {
      console.warn('Could not read config file, falling back to defaults:', error);
      logger.logError('Settings.loadConfig', error);
    }
    return { lang: 'zh_CN', plans: {} };
  }

  private saveConfig(config?: Config): void {
    try {
      this.ensureConfigDir();
      const configToSave = config || this.config;
      const yamlContent = yaml.dump(configToSave);
      writeFileSync(CONFIG_PATH, yamlContent, 'utf-8');
      this.config = configToSave;
    } catch (error) {
      console.error('Unable to write config file:', error);
      logger.logError('Settings.saveConfig', error);
      throw error;
    }
  }

  getConfig(): Config {
    return { ...this.config };
  }

  updateConfig(updates: Partial<Config>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  isFirstRun(): boolean {
    return !existsSync(CONFIG_PATH);
  }

  getLang(): string {
    return this.config.lang || 'zh_CN';
  }

  setLang(lang: string): void {
    this.updateConfig({ lang });
  }

  getPlanConfig(planId: string): PlanConfig | undefined {
    return this.config.plans?.[planId as keyof typeof this.config.plans];
  }

  setApiKey(planId: string, apiKey: string): void {
    const plans = { ...this.config.plans };
    if (!plans[planId as keyof typeof plans]) {
      plans[planId as keyof typeof plans] = {};
    }
    (plans[planId as keyof typeof plans] as PlanConfig).api_key = apiKey;
    this.updateConfig({ plans });
  }

  setModel(planId: string, model: string): void {
    const plans = { ...this.config.plans };
    if (!plans[planId as keyof typeof plans]) {
      plans[planId as keyof typeof plans] = {};
    }
    (plans[planId as keyof typeof plans] as PlanConfig).model = model;
    this.updateConfig({ plans });
  }

  getApiKey(planId: string): string | undefined {
    return this.config.plans?.[planId as keyof typeof this.config.plans]?.api_key;
  }

  getModel(planId: string): string | undefined {
    return this.config.plans?.[planId as keyof typeof this.config.plans]?.model;
  }

  revokeApiKey(planId: string): void {
    const plans = { ...this.config.plans };
    if (plans[planId as keyof typeof plans]) {
      delete (plans[planId as keyof typeof plans] as PlanConfig).api_key;
      this.updateConfig({ plans });
    }
  }

  hasAnyConfig(): boolean {
    return !!(this.config.plans?.['cp_test_lite']?.api_key 
      || this.config.plans?.['cp_test_pro']?.api_key
      || this.config.plans?.['cp_test_enterprise']?.api_key
      || this.config.plans?.['pay_as_you_go']?.api_key
    );
  }
}

export const settings = new Settings();
