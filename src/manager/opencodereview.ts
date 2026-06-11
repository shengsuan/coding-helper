import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { PLANS, type Plan } from "../lib/constants.js";
import { logger } from "../utils/logger.js";
import { validateModelSupport } from "../lib/model-selector.js";
import { getModels } from "../lib/models.js";

interface OpenCodeReviewLlm {
  url: string;
  auth_token: string;
  model: string;
  use_anthropic: boolean;
}

interface OpenCodeReviewConfig {
  llm?: OpenCodeReviewLlm;
  [key: string]: unknown;
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

export class OpenCodeReviewManager {
  private configPath: string;

  constructor() {
    this.configPath = join(homedir(), ".opencodereview", "config.json");
  }

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  getConfig(): OpenCodeReviewConfig | null {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("Failed to read OpenCodeReview config:", error);
      logger.logError("OpenCodeReviewManager.getConfig", error);
    }
    return null;
  }

  private saveConfig(config: OpenCodeReviewConfig): void {
    try {
      this.ensureDir(this.configPath);
      writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save OpenCodeReview config: ${error}`);
    }
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    const currentConfig = this.getConfig() || {};
    const models = await getModels(plan.id);
    const selectedModelId = validateModelSupport(
      models,
      model || models[0]?.id,
      ["/v1/messages"],
      "opencodereview"
    );

    const newConfig: OpenCodeReviewConfig = {
      ...currentConfig,
      llm: {
        url: `${plan.anthropicBaseUrl}/v1/messages`,
        auth_token: apiKey,
        model: selectedModelId,
        use_anthropic: true,
      },
    };

    this.saveConfig(newConfig);
  }

  unloadPlanConfig(planId?: string): void {
    const currentConfig = this.getConfig();
    if (!currentConfig?.llm) return;

    const currentUrl = currentConfig.llm.url;
    const matchesPlan = !planId || Object.values(PLANS).some(
      (p) => p.id === planId && currentUrl.startsWith(p.anthropicBaseUrl)
    );

    if (matchesPlan) {
      delete currentConfig.llm;
      this.saveConfig(currentConfig);
    }
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const config = this.getConfig();
      if (!config?.llm?.auth_token || !config.llm.url) {
        return { plan: null, apiKey: null };
      }

      for (const plan of Object.values(PLANS)) {
        if (config.llm.url.startsWith(plan.anthropicBaseUrl)) {
          return { plan: plan.id, apiKey: config.llm.auth_token };
        }
      }

      return { plan: null, apiKey: null };
    } catch {
      return { plan: null, apiKey: null };
    }
  }
}

export const openCodeReviewManager = new OpenCodeReviewManager();
