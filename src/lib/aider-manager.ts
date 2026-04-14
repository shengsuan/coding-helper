import { existsSync, readFileSync, writeFileSync } from "fs";
import { validateModelSupport } from "./model-selector.js";
import { type Plan } from "./constants.js";
import { logger } from "../utils/logger.js";
import { homedir } from "os";
import { join } from "path";
import yaml from 'js-yaml';

export interface AiderConfig {
  ssy_code_plan?: string;
  model: string;
  openai_api_key?: string;
  openai_api_base?: string;
  [key:string]: unknown;
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

export class AiderManager {
  private configsPath: string;

  constructor() {
    this.configsPath = join(homedir(), ".aider.conf.yml");
  }

  getConfigs(): AiderConfig {
    try {
      if (existsSync(this.configsPath)) {
        const content = readFileSync(this.configsPath, "utf-8");
        return yaml.load(content) as AiderConfig;
      }
    } catch (error) {
      console.warn("Failed to read Aider settings:", error);
      logger.logError("AiderManager.getSettings", error);
    }
    return {} as AiderConfig;
  }

  saveConfigs(config: AiderConfig): void {
    try {
      writeFileSync( this.configsPath, yaml.dump(config), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save Aider settings: ${error}`);
    }
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    const currentConfigs = this.getConfigs();
    const models = await plan.getModels || plan.models;

    const selectedModelId = validateModelSupport(
      models,
      model || plan.models[0]?.id,
      ["/v1/chat/completions"],
      "aider"
    );
    const planConfig: AiderConfig = {
      ...currentConfigs,
      model: "openai/" + selectedModelId,
      ssy_code_plan: plan.id,
      openai_api_key: apiKey,
      openai_api_base: plan.baseUrl,
    };
    this.saveConfigs(planConfig);
  }
  
  unloadPlanConfig(): void {
    const currentConfigs = this.getConfigs();
    if (!currentConfigs.ssy_code_plan || !currentConfigs.openai_api_base?.includes("shengsuanyun")) {
      return;
    }
    delete currentConfigs.ssy_code_plan;
    delete currentConfigs.openai_api_base;
    delete currentConfigs.openai_api_key;
    this.saveConfigs(currentConfigs);
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const currentConfigs = this.getConfigs();
      if (!currentConfigs.ssy_code_plan || !currentConfigs.openai_api_base?.includes("shengsuanyun") ) {
        return { plan: null, apiKey: null };
      }
      const plan = currentConfigs.ssy_code_plan;
      const apiKey = currentConfigs.openai_api_key || null;
      return { plan, apiKey };
    } catch {
      return { plan: null, apiKey: null };
    }
  }
}

export const aiderManager = new AiderManager();
