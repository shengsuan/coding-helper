import { existsSync, readFileSync, writeFileSync } from "fs";
import { validateModelSupport } from "./model-selector.js";
import { type Plan } from "./constants.js";
import { logger } from "../utils/logger.js";
import { homedir } from "os";
import { join } from "path";
import { Document, parseDocument } from 'yaml';

export interface HermesConfigShape {
  model: {
    default: string;
    provider: string;
    api_key: string;
    base_url: string;
    [key: string]: string;
  };
  [key: string]: unknown;
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

export class HermesManager {
  private configsPath: string;

  constructor() {
    this.configsPath = join(homedir(), ".hermes", "config.yaml");
  }

  getConfigs(): Document {
    try {
      if (existsSync(this.configsPath)) {
        const content = readFileSync(this.configsPath, "utf-8");
        return parseDocument(content);
      }
    } catch (error) {
      console.warn("Failed to read Hermes settings:", error);
      logger.logError("HermesManager.getSettings", error);
    }
    return new Document({});
  }

  saveConfigs(config: Document): void {
    try {
      writeFileSync(this.configsPath, config.toString(), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save Hermes settings: ${error}`);
    }
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    const currentConfigs = this.getConfigs();
    const models = await plan.getModels() || plan.models;
    const selectedModelId = validateModelSupport(
      models,
      model || plan.models[0]?.id,
      ["/v1/chat/completions"],
      "hermes"
    );
    currentConfigs.setIn(["model", "ssy_code_plan"], plan.id);
    currentConfigs.setIn(["model", "provider"], "custom");

    // Set api_key with PLAIN string style to avoid line folding
    const apiKeyNode = currentConfigs.createNode(apiKey);
    if (apiKeyNode && typeof apiKeyNode === 'object' && 'type' in apiKeyNode) {
      (apiKeyNode as any).type = 'PLAIN';
    }
    currentConfigs.setIn(["model", "api_key"], apiKeyNode);

    currentConfigs.setIn(["model", "base_url"], plan.baseUrl);
    currentConfigs.setIn(["model", "default"], selectedModelId);
    this.saveConfigs(currentConfigs);
  }
  
  unloadPlanConfig(): void {
    const currentConfigs = this.getConfigs();
    let isModified = false;

    // Check if ssy_code_plan exists in model section
    const plan = currentConfigs.getIn(['model', 'ssy_code_plan']);
    if (plan) {
      currentConfigs.deleteIn(['model', 'ssy_code_plan']);
      isModified = true;
    }

    // Check if base_url points to shengsuanyun
    const apiBase = currentConfigs.getIn(['model', 'base_url']);
    if (typeof apiBase === "string" && apiBase.includes("shengsuanyun")) {
      currentConfigs.setIn(["model", "api_key"], "");
      currentConfigs.setIn(["model", "base_url"], "");
      isModified = true;
    }

    if (isModified) {
      this.saveConfigs(currentConfigs);
    }
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const currentConfigs = this.getConfigs();
      const modelNode = currentConfigs.get('model');

      // Get plan and apiKey using YAML document getIn method for nested access
      const plan = currentConfigs.getIn(['model', 'ssy_code_plan']);
      const apiKey = currentConfigs.getIn(['model', 'api_key']);

      logger.logError("Detected Hermes config - plan:", plan + " apiKey:" + apiKey);

      if (typeof plan !== "string") {
        return { plan: null, apiKey: null };
      }
      return {
        plan,
        apiKey: typeof apiKey === "string" ? apiKey : null
      };
    } catch (error) {
      logger.logError("HermesManager.detectCurrentConfig", error);
      return { plan: null, apiKey: null };
    }
  }
}

export const hermesManager = new HermesManager();