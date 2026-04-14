import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { PLANS, type Plan } from "./constants.js";
import { logger } from "../utils/logger.js";
import yaml from 'js-yaml';
import { validateModelSupport } from "./model-selector.js";

export interface PicoClawConfig {
    agents:     Record<string, AgentsDefaults>;
    model_list: ModelList[];
    [key:string]: unknown;
}

export interface AgentsDefaults {
    workspace:                    string;
    restrict_to_workspace:        boolean;
    allow_read_outside_workspace: boolean;
    provider:                     string;
    model_name:                   string;
    max_tokens:                   number;
    max_tool_iterations:          number;
    summarize_message_threshold:  number;
    summarize_token_percent:      number;
    steering_mode:                string;
    subturn:                      {
        max_depth:               number;
        max_concurrent:          number;
        default_timeout_minutes: number;
        default_token_budget:    number;
        concurrency_timeout_sec: number;
    };
    tool_feedback:                {
        enabled:         boolean;
        max_args_length: number;
    };
    split_on_marker:              boolean;
}

export interface ModelList {
    model_name:   string;
    model:        string;
    api_base?:    string;
    auth_method?: string;
}

export interface PicoClawSecurity {
    model_list: Record<string, {api_keys: string[]}>;
    channels: {};
    web:{};
    skills:{};
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

export class PicoclawManager {
  private configsPath: string;
  private secrurityPath: string;

  constructor() {
    this.configsPath = join(homedir(), ".picoclaw", "config.json");
    this.secrurityPath = join(homedir(), ".picoclaw", ".security.yml");
  }

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  getConfigs(): PicoClawConfig {
    try {
      if (existsSync(this.configsPath)) {
        const content = readFileSync(this.configsPath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("Failed to read Picoclaw settings:", error);
      logger.logError("PicoclawManager.getSettings", error);
    }
    return {} as PicoClawConfig;
  }

  saveConfigs(config: PicoClawConfig): void {
    try {
      this.ensureDir(this.configsPath);
      writeFileSync(
        this.configsPath,
        JSON.stringify(config, null, 2),
        "utf-8",
      );
    } catch (error) {
      throw new Error(`Failed to save Claude Code settings: ${error}`);
    }
  }

  getSecurity(): PicoClawSecurity {
    try {
      if (existsSync(this.secrurityPath)) {
        const content = readFileSync(this.secrurityPath, "utf-8");
        return yaml.load(content) as PicoClawSecurity;
      }
    } catch (error) {
      console.warn("Failed to read PicoClaw security:", error);
      logger.logError("PicoClawManager.getSecurity", error);
    }
    return {} as PicoClawSecurity;
  }

  saveSecurity(config: PicoClawSecurity): void {
    try {
      this.ensureDir(this.secrurityPath);
      writeFileSync(
        this.secrurityPath,
        yaml.dump(config),
        "utf-8",
      );
    } catch (error) {
      throw new Error(`Failed to save PicoClaw security: ${error}`);
    }
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    const currentConfigs = this.getConfigs();
    const models = await plan.getModels() || plan.models;

    const selectedModelId = validateModelSupport(
      models,
      model || plan.models[0]?.id,
      ["/v1/chat/completions"],
      "picoclaw"
    );
    const modelName = selectedModelId.split("/").slice(-1)[0];
    const selectedModel = `${plan.id}__${modelName}`;
    const planConfig: PicoClawConfig = {
      ...currentConfigs,
      agents: {
        defaults:{
            ...currentConfigs.agents?.defaults,
            provider:`shengsuanyun`,
            model_name: selectedModel,
        },
        secondary:currentConfigs.agents?.defaults,
      },
      model_list:[
        ...(currentConfigs.model_list || []),
        {
            "model_name": selectedModel,
            "model": `shengsuanyun/${selectedModelId}`,
            "api_base": plan.baseUrl,
        },
      ]
    };
    this.saveConfigs(planConfig);

    const currentSecurity = this.getSecurity();
    const updatedSecurity: PicoClawSecurity = {
      ...currentSecurity,
      model_list: {
        ...currentSecurity.model_list,
        [selectedModel]: {
          api_keys: [apiKey],
        }
      }
    };
    this.saveSecurity(updatedSecurity);
  }
  
  unloadPlanConfig(): void {
    const currentConfigs = this.getConfigs();
    if (!currentConfigs.agents?.secondary) {
      return;
    }

    const planConfig: PicoClawConfig = {
      ...currentConfigs,
      agents: {
        ...currentConfigs.agents,
        defaults:currentConfigs.agents.secondary
      }
    };
    this.saveConfigs(planConfig);
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const currentConfigs = this.getConfigs();
      const currentSecurity = this.getSecurity();

      if (!currentConfigs.agents?.defaults?.provider 
        || !currentSecurity.model_list 
        || currentConfigs.agents?.defaults?.provider !== "shengsuanyun") {
        return { plan: null, apiKey: null };
      }
      const cpid = currentConfigs.agents?.defaults?.model_name?.split("__")?.[0];
      const apiKey = currentSecurity.model_list[ currentConfigs.agents?.defaults?.model_name ]?.api_keys?.[0] || null;

      let plan: string | null = null;
      for (const [planId] of Object.entries(PLANS)) {
        if (planId === cpid) {
          plan = planId;
          break;
        }
      }
      return { plan, apiKey };
    } catch {
      return { plan: null, apiKey: null };
    }
  }
}

export const picoclawManager = new PicoclawManager();
