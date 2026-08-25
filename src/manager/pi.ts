import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { validateModelSupport } from "../lib/model-selector.js";
import { PLANS, type Plan } from "../lib/constants.js";
import { getModels } from "../lib/models.js";
import { logger } from "../utils/logger.js";
import { dirname, join } from "path";
import { homedir } from "os";

interface PiModel {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
  reasoning: boolean;
  input?: string[];
}

interface PiProvider {
  baseUrl: string;
  api: "openai-completions";
  apiKey: string;
  compat: {
    supportsDeveloperRole: boolean;
    supportsReasoningEffort: boolean;
  };
  models: PiModel[];
}

interface PiModelsConfig {
  providers?: Record<string, PiProvider | unknown>;
  [key: string]: unknown;
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

export class PiManager {
  private readonly configPath = join(homedir(), ".pi", "agent", "models.json");
  private readonly providerKey = "shengsuanyun";

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  getConfig(): PiModelsConfig | null {
    try {
      if (!existsSync(this.configPath)) return null;
      return JSON.parse(readFileSync(this.configPath, "utf-8")) as PiModelsConfig;
    } catch (error) {
      logger.logError("PiManager.getConfig", error);
      return null;
    }
  }

  private saveConfig(config: PiModelsConfig): void {
    try {
      this.ensureDir(this.configPath);
      writeFileSync(this.configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
    } catch (error) {
      throw new Error(`Failed to save Pi models config: ${error}`);
    }
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    const currentConfig = this.getConfig() || {};
    const models = await getModels(plan.id);
    const selectedModelId = validateModelSupport(
      models,
      model || models[0]?.id,
      ["/v1/chat/completions"],
      "pi",
    );
    const selectedModel = models.find(({ id }) => id === selectedModelId)!;
    const input = selectedModel.modalities?.input.filter(
      (modality) => modality === "text" || modality === "image",
    );

    const provider: PiProvider = {
      baseUrl: plan.baseUrl,
      api: "openai-completions",
      apiKey,
      compat: {
        supportsDeveloperRole: false,
        supportsReasoningEffort: true,
      },
      models: [
        {
          id: selectedModel.id,
          name: selectedModel.id,
          contextWindow: selectedModel.contextLength,
          maxTokens: selectedModel.maxTokens,
          reasoning: true,
          ...(input?.length ? { input } : {}),
        },
      ],
    };

    this.saveConfig({
      ...currentConfig,
      providers: {
        ...(currentConfig.providers || {}),
        [this.providerKey]: provider,
      },
    });
  }

  unloadPlanConfig(planId?: string): void {
    const currentConfig = this.getConfig();
    if (!currentConfig?.providers) return;

    const provider = currentConfig.providers[this.providerKey] as Partial<PiProvider> | undefined;
    if (!provider || typeof provider.baseUrl !== "string") return;
    const matchesPlan = !planId || provider.baseUrl === PLANS[planId]?.baseUrl;
    if (!matchesPlan) return;

    delete currentConfig.providers[this.providerKey];
    if (Object.keys(currentConfig.providers).length === 0) delete currentConfig.providers;
    this.saveConfig(currentConfig);
  }

  detectCurrentConfig(): DetectedConfig {
    const provider = this.getConfig()?.providers?.[this.providerKey] as Partial<PiProvider> | undefined;
    if (!provider || typeof provider.baseUrl !== "string" || typeof provider.apiKey !== "string") {
      return { plan: null, apiKey: null };
    }

    const plan = Object.values(PLANS).find(({ baseUrl }) => baseUrl === provider.baseUrl);
    return plan ? { plan: plan.id, apiKey: provider.apiKey } : { plan: null, apiKey: null };
  }
}

export const piManager = new PiManager();
