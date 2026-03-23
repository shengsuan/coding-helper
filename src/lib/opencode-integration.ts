import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { PLANS, type Plan } from "./constants.js";
import { logger } from "../utils/logger.js";

interface OpenCodeModel {
  name: string;
  limit?: {
    context?: number;
    output?: number;
  };
  modalities?: {
    input: string[];
    output: string[];
  };
}

interface OpenCodeProvider {
  npm: string;
  name: string;
  options: {
    baseURL: string;
    apiKey?: string;
    headers?: Record<string, string>;
  };
  models: Record<string, OpenCodeModel>;
}

interface OpenCodeConfig {
  $schema?: string;
  model?: string;
  provider?: Record<string, OpenCodeProvider>;
  [key: string]: unknown;
}

interface AuthConfig {
  [providerId: string]: {
    type: "api";
    key: string;
  };
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

export class OpenCodeIntegration {
  private configPath: string;
  private authPath: string;

  constructor() {
    this.configPath = join(homedir(), ".config", "opencode", "opencode.json");
    this.authPath = join(homedir(), ".local", "share", "opencode", "auth.json");
  }

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  getConfig(): OpenCodeConfig | null {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("Failed to read OpenCode config:", error);
      logger.logError("OpenCodeIntegration.getConfig", error);
    }
    return null;
  }

  private getAuthConfig(): AuthConfig | null {
    try {
      if (existsSync(this.authPath)) {
        const content = readFileSync(this.authPath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("Failed to read OpenCode auth config:", error);
      logger.logError("OpenCodeIntegration.getAuthConfig", error);
    }
    return null;
  }

  private saveConfig(config: OpenCodeConfig): void {
    try {
      this.ensureDir(this.configPath);
      writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save OpenCode config: ${error}`);
    }
  }

  private saveAuthConfig(auth: AuthConfig): void {
    try {
      this.ensureDir(this.authPath);
      writeFileSync(this.authPath, JSON.stringify(auth, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save OpenCode auth config: ${error}`);
    }
  }

  loadPlanConfig(plan: Plan, apiKey: string, model?: string): void {
    const currentConfig = this.getConfig() || {};
    const currentAuth = this.getAuthConfig() || {};

    if ("defaultModel" in currentConfig) {
      delete currentConfig.defaultModel;
    }

    const models: Record<string, OpenCodeModel> = {};
    const lts = ["text", "audio", "image","video", "pdf"]
    for (const m of plan.models) {
      const entry: OpenCodeModel = {
        name: m.id,
        limit: {
          context: m.contextLength,
          output: 4096,
        },
      };
      const hasInvalidInput = m.modalities?.input?.some(mod => !lts.includes(mod));
      const hasInvalidOutput = m.modalities?.output?.some(mod => !lts.includes(mod));
      if (!m.modalities || hasInvalidInput || hasInvalidOutput) {
        continue;
      }
      entry.modalities = m.modalities;
      models[m.id] = entry;
    }

    const provider: OpenCodeProvider = {
      npm: "@ai-sdk/openai-compatible",
      name: plan.name,
      options: {
        baseURL: plan.baseUrl,
        apiKey: apiKey,
      },
      models,
    };

    const selectedModel = model || plan.models[0].id;
    const newConfig: OpenCodeConfig = {
      $schema: "https://opencode.ai/config.json",
      ...currentConfig,
      model: `${plan.id}/${selectedModel}`,
      provider: {
        ...(currentConfig.provider || {}),
        [plan.id]: provider,
      },
    };

    this.saveConfig(newConfig);
  }

  unloadPlanConfig(planId?: string): void {
    const currentConfig = this.getConfig();

    if (currentConfig?.provider) {
      if (planId) {
        delete currentConfig.provider[planId];
      } else {
        delete currentConfig.provider["ssy_cp_lite"];
        delete currentConfig.provider["ssy_cp_pro"];
      }

      if (Object.keys(currentConfig.provider).length === 0) {
        delete currentConfig.provider;
      }

      if (currentConfig.model) {
        if (
          !planId ||
          currentConfig.model.startsWith(`${planId}/`) ||
          !currentConfig.provider
        ) {
          delete currentConfig.model;
        }
      }

      this.saveConfig(currentConfig);
    }

    // Also clean up legacy auth.json if it exists
    const currentAuth = this.getAuthConfig();
    if (currentAuth) {
      if (planId) {
        delete currentAuth[planId];
      } else {
        delete currentAuth["ssy_cp_lite"];
        delete currentAuth["ssy_cp_pro"];
      }
      if (Object.keys(currentAuth).length > 0) {
        this.saveAuthConfig(currentAuth);
      }
    }
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const config = this.getConfig();

      if (!config?.provider) {
        return { plan: null, apiKey: null };
      }

      // Prefer the plan that the active model points to
      if (config.model) {
        const primaryPlanId = config.model.split("/")[0];
        const provider = config.provider[primaryPlanId];
        if (provider) {
          // Read apiKey from provider.options first, fallback to legacy auth.json
          const apiKey =
            provider.options?.apiKey ||
            this.getAuthConfig()?.[primaryPlanId]?.key ||
            null;
          return { plan: primaryPlanId, apiKey };
        }
      }

      // Fallback: return the first configured plan
      for (const planId of ["ssy_cp_lite", "ssy_cp_pro"]) {
        const provider = config.provider[planId];
        if (provider) {
          const apiKey =
            provider.options?.apiKey ||
            this.getAuthConfig()?.[planId]?.key ||
            null;
          return { plan: planId, apiKey };
        }
      }

      return { plan: null, apiKey: null };
    } catch {
      return { plan: null, apiKey: null };
    }
  }

  getProviderModels(planId: string): string[] {
    return PLANS[planId]?.models.map((m) => m.id) || [];
  }
}

export const openCodeIntegration = new OpenCodeIntegration();
