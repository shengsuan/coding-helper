import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { validateModelSupport } from './model-selector.js';
import { PLANS, type Plan } from './constants.js';
import { logger } from '../utils/logger.js';
import { getModels } from './models.js';
import { dirname, join } from 'path';
import * as toml from '@iarna/toml';
import { homedir } from 'os';

interface CodexAuth{
  auth_mode?: string;
  OPENAI_API_KEY?: string;
}
interface CodexConfig {
  model:string;
  openai_base_url?:string;
  ssy_code_plan_id?:string;
  "notice.model_migrations"?: Record<string, string>;
}
interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

export class CodexManager {
  private configPath = join(homedir(), '.codex', 'config.toml');
  private authPath = join(homedir(), '.codex', 'auth.json');

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  getConfig(): CodexConfig | null {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, 'utf-8');
        return toml.parse(content) as unknown as CodexConfig;
      }
    } catch (error) {
      logger.logError('CodexManager.getConfig', error);
    }
    return null;
  }

  private saveConfig(config: CodexConfig): void {
    try {
      this.ensureDir(this.configPath);
      const tomlContent = toml.stringify(config as any);
      writeFileSync(this.configPath, tomlContent, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save Codex config: ${error}`);
    }
  }

  getAuthConfig(): CodexAuth | null {
    try {
      if (existsSync(this.authPath)) {
        const content = readFileSync(this.authPath, 'utf-8');
        return JSON.parse(content) as CodexAuth;
      }
    } catch (error) {
      logger.logError('CodexManager.getAuthConfig', error);
    }
    return null;
  }

  private saveAuthConfig(config: CodexAuth): void {
    try {
      this.ensureDir(this.authPath);
      writeFileSync(this.authPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save Auth config: ${error}`);
    }
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    const mapping = PLANS[plan.id];
    if (!mapping) {
      throw new Error(`Unsupported plan for Codex: ${plan.id}`);
    }

    const currentConfig = this.getConfig() || {} as CodexConfig;
    const models = await getModels(plan.id);
    const selectedModel = validateModelSupport(
      models,
      model ||models[0]?.id,
      [ "/v1/responses" ],
      "codex"
    );

    currentConfig.model = selectedModel;
    currentConfig.openai_base_url = mapping.baseUrl;
    currentConfig.ssy_code_plan_id = plan.id;

    if (!currentConfig['notice.model_migrations']) {
      currentConfig['notice.model_migrations'] = {"gpt-5.3-codex": "openai/gpt-5.3-codex"};
    }

    const shortModelName = selectedModel.includes('/') ? selectedModel.split('/').pop()! : selectedModel;
    currentConfig['notice.model_migrations'][shortModelName] = selectedModel;

    this.saveConfig(currentConfig);

    const currentAuth = this.getAuthConfig() || {};
    currentAuth["OPENAI_API_KEY"] = apiKey;
    this.saveAuthConfig(currentAuth);
  }

  unloadPlanConfig(planId?: string): void {
    const currentConfig = this.getConfig();
    const currentAuth = this.getAuthConfig();
    let changedConfig = false;
    let changedAuth = false;

    if (currentConfig && currentConfig.openai_base_url) {
      const currentPlanId = currentConfig.ssy_code_plan_id;
      if (currentPlanId) {
        delete currentConfig.openai_base_url;
        delete currentConfig.ssy_code_plan_id;
        currentConfig.model="gpt-5.3-codex"
        changedConfig = true;
      }
    }

    if (currentAuth && currentAuth.OPENAI_API_KEY) {
      delete currentAuth.OPENAI_API_KEY;
      changedAuth = true;
    }

    if (changedConfig && currentConfig) {
      this.saveConfig(currentConfig);
    }
    if (changedAuth && currentAuth) {
      this.saveAuthConfig(currentAuth);
    }
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const config = this.getConfig();
      const auth = this.getAuthConfig();
      if (!config) {
        return { plan: null, apiKey: null };
      }
      if (config.openai_base_url) {
        return {
          plan: config.ssy_code_plan_id || null,
          apiKey: auth?.OPENAI_API_KEY || null
        };
      }
      return { plan: null, apiKey: null };
    } catch {
      return { plan: null, apiKey: null };
    }
  }
}

export const codexManager = new CodexManager();