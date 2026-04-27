import { existsSync, readFileSync, writeFileSync } from "fs";
import { validateModelSupport } from "./model-selector.js";
import { Document, parseDocument } from 'yaml';
import { type Plan } from "./constants.js";
import { logger } from "../utils/logger.js";
import { getModels } from "./models.js";
import { homedir } from "os";
import { join } from "path";

export interface AiderConfigShape {
  "ssy-code-plan"?: string;
  model: string;
  "openai-api-key"?: string;
  "openai-api-base"?: string;
  [key: string]: unknown;
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

  getConfigs(): Document {
    try {
      if (existsSync(this.configsPath)) {
        const content = readFileSync(this.configsPath, "utf-8");
        return parseDocument(content);
      }
    } catch (error) {
      console.warn("Failed to read Aider settings:", error);
      logger.logError("AiderManager.getSettings", error);
    }
    return new Document({});
  }

  saveConfigs(config: Document): void {
    try {
      writeFileSync(this.configsPath, config.toString(), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save Aider settings: ${error}`);
    }
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    const currentConfigs = this.getConfigs();
    const models = await getModels(plan.id);
    const selectedModelId = validateModelSupport(
      models,
      model || models[0]?.id,
      ["/v1/chat/completions"],
      "aider"
    );
    currentConfigs.commentBefore = `ssy-code-plan:${plan.id}`;
    currentConfigs.set("openai-api-key", apiKey);
    currentConfigs.set("openai-api-base", plan.baseUrl);
    currentConfigs.set("model", 'openai/'+selectedModelId);
    this.saveConfigs(currentConfigs);
  }
  
  unloadPlanConfig(): void {
    const currentConfigs = this.getConfigs();
    let isModified = false;
    if (currentConfigs.commentBefore && currentConfigs.commentBefore.includes('ssy-code-plan:')) {
      const comments = currentConfigs.commentBefore.split('\n');
      const filteredComments = comments.filter(c => !c.includes('ssy-code-plan:'));
      currentConfigs.commentBefore = filteredComments.length > 0 ? filteredComments.join('\n') : null;
      isModified = true;
    }
    const apiBase = currentConfigs.get("openai-api-base");
    if (typeof apiBase === "string" && apiBase.includes("shengsuanyun")) {
      currentConfigs.delete("openai-api-key");
      currentConfigs.delete("openai-api-base");
      isModified = true;
    }
    if (isModified) {
      this.saveConfigs(currentConfigs);
    }
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const currentConfigs = this.getConfigs();
      const apiBase = currentConfigs.get("openai-api-base");
      const apiKey = currentConfigs.get("openai-api-key");

      if (typeof apiBase !== "string" || !apiBase.includes("shengsuanyun")) {
        return { plan: null, apiKey: null };
      }
      let planId: string | null = null;
      if (currentConfigs.commentBefore) {
        const match = currentConfigs.commentBefore.match(/ssy-code-plan:([^\s]+)/);
        if (match) {
          planId = match[1];
        }
      }

      return { 
        plan: planId, 
        apiKey: typeof apiKey === "string" ? apiKey : null 
      };
    } catch {
      return { plan: null, apiKey: null };
    }
  }
}

export const aiderManager = new AiderManager();