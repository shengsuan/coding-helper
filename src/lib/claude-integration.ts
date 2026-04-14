import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { PLANS, type Plan } from "./constants.js";
import { logger } from "../utils/logger.js";
import { validateModelSupport } from "./model-selector.js";

interface ClaudeCodeSettings {
  env?: Record<string, string | number>;
  [key: string]: unknown;
}

interface ClaudeCodeMCPConfig {
  hasCompletedOnboarding?: boolean;
  mcpServers?: Record<string, MCPServerConfig>;
  [key: string]: unknown;
}

interface MCPServerConfig {
  type: "stdio" | "sse" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

export class ClaudeIntegration {
  private settingsPath: string;
  private mcpConfigPath: string;

  constructor() {
    this.settingsPath = join(homedir(), ".claude", "settings.json");
    this.mcpConfigPath = join(homedir(), ".claude.json");
  }

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  getSettings(): ClaudeCodeSettings {
    try {
      if (existsSync(this.settingsPath)) {
        const content = readFileSync(this.settingsPath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("Failed to read Claude Code settings:", error);
      logger.logError("ClaudeIntegration.getSettings", error);
    }
    return {};
  }

  saveSettings(config: ClaudeCodeSettings): void {
    try {
      this.ensureDir(this.settingsPath);
      writeFileSync(
        this.settingsPath,
        JSON.stringify(config, null, 2),
        "utf-8",
      );
    } catch (error) {
      throw new Error(`Failed to save Claude Code settings: ${error}`);
    }
  }

  getMCPConfig(): ClaudeCodeMCPConfig {
    try {
      if (existsSync(this.mcpConfigPath)) {
        const content = readFileSync(this.mcpConfigPath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("Failed to read Claude Code MCP config:", error);
      logger.logError("ClaudeIntegration.getMCPConfig", error);
    }
    return {};
  }

  saveMCPConfig(config: ClaudeCodeMCPConfig): void {
    try {
      this.ensureDir(this.mcpConfigPath);
      writeFileSync(
        this.mcpConfigPath,
        JSON.stringify(config, null, 2),
        "utf-8",
      );
    } catch (error) {
      throw new Error(`Failed to save Claude Code MCP config: ${error}`);
    }
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    this.ensureOnboardingCompleted();
    this.purgeConflictingEnvVars();

    const currentSettings = this.getSettings();
    const currentEnv = currentSettings.env || {};
    const { ANTHROPIC_API_KEY: _, ...cleanedEnv } = currentEnv;

    const models = await plan.getModels() || plan.models;
    const defaultModel = validateModelSupport(
      models,
      model || plan.models[0]?.id,
      ["/v1/messages"],
      "claude-code"
    );

    const planConfig: ClaudeCodeSettings = {
      ...currentSettings,
      env: {
        ...cleanedEnv,
        ANTHROPIC_AUTH_TOKEN: apiKey,
        ANTHROPIC_API_KEY: apiKey,                //todo: remove in future, keep for backward compatibility
        ANTHROPIC_BASE_URL: plan.anthropicBaseUrl,
        ANTHROPIC_MODEL: defaultModel,
        API_TIMEOUT_MS: "3000000",
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
        CLAUDE_CODE_ATTRIBUTION_HEADER: 0,
        CC_CP_SSY: plan.id,
      },
    };

    this.saveSettings(planConfig);
  }

  private ensureOnboardingCompleted(): void {
    try {
      const mcpConfig = this.getMCPConfig();
      if (!mcpConfig.hasCompletedOnboarding) {
        this.saveMCPConfig({ ...mcpConfig, hasCompletedOnboarding: true });
      }
    } catch (error) {
      logger.logError("ClaudeIntegration.ensureOnboardingCompleted", error);
    }
  }

  private purgeConflictingEnvVars(): void {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_BASE_URL) {
      return;
    }

    try {
      const rcFile = this.getShellRcFilePath();
      if (!rcFile || !existsSync(rcFile)) {
        return;
      }

      const original = readFileSync(rcFile, "utf-8");
      const cleaned = original
        .split("\n")
        .filter(line => !this.isConflictingExport(line))
        .join("\n");

      if (cleaned !== original) {
        writeFileSync(rcFile, cleaned, "utf-8");
        console.log(`Removed conflicting ANTHROPIC_* entries from ${rcFile}`);
      }
    } catch (error) {
      console.warn("Failed to purge shell environment variables:", error);
      logger.logError("ClaudeIntegration.purgeConflictingEnvVars", error);
    }
  }

  private static readonly MANAGED_ENV_VARS = [
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_AUTH_TOKEN',
  ];

  private isConflictingExport(line: string): boolean {
    const trimmed = line.trim();
    if (trimmed.startsWith('# coding-helper')) return true;
    for (const v of ClaudeIntegration.MANAGED_ENV_VARS) {
      if (trimmed.startsWith(`export ${v}=`)) return true;
    }
    return false;
  }

  private getShellRcFilePath(): string | null {
    const home = homedir();

    if (process.platform === "win32") {
      return null;
    }

    const shell = process.env.SHELL || "";
    const shellName = shell.split("/").pop() || "";

    switch (shellName) {
      case "bash":
        return join(home, ".bashrc");
      case "zsh":
        return join(home, ".zshrc");
      case "fish":
        return join(home, ".config", "fish", "config.fish");
      default:
        return join(home, ".profile");
    }
  }

  unloadPlanConfig(): void {
    const currentSettings = this.getSettings();
    if (!currentSettings.env) {
      return;
    }

    const {
      ANTHROPIC_AUTH_TOKEN: _1,
      ANTHROPIC_BASE_URL: _2,
      ANTHROPIC_MODEL: _3,
      API_TIMEOUT_MS: _4,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: _5,
      ...otherEnv
    } = currentSettings.env;

    const newSettings: ClaudeCodeSettings = {
      ...currentSettings,
      env: otherEnv,
    };

    if (newSettings.env && Object.keys(newSettings.env).length === 0) {
      delete newSettings.env;
    }

    this.saveSettings(newSettings);
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const currentSettings = this.getSettings();
      if (!currentSettings.env || !currentSettings.env.CC_CP_SSY) {
        return { plan: null, apiKey: null };
      }
      const cpid = currentSettings.env.CC_CP_SSY
      const apiKey = currentSettings.env.ANTHROPIC_AUTH_TOKEN as string;
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

  isMCPInstalled(mcpId: string): boolean {
    try {
      const config = this.getMCPConfig();
      if (!config.mcpServers) {
        return false;
      }
      return mcpId in config.mcpServers;
    } catch {
      return false;
    }
  }

  installMCP(mcpId: string, mcpConfig: MCPServerConfig): void {
    try {
      const config = this.getMCPConfig();
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      config.mcpServers[mcpId] = mcpConfig;
      this.saveMCPConfig(config);
    } catch (error) {
      throw new Error(`Failed to install MCP ${mcpId}: ${error}`);
    }
  }

  uninstallMCP(mcpId: string): void {
    try {
      const config = this.getMCPConfig();
      if (!config.mcpServers) {
        return;
      }
      delete config.mcpServers[mcpId];
      this.saveMCPConfig(config);
    } catch (error) {
      throw new Error(`Failed to uninstall MCP ${mcpId}: ${error}`);
    }
  }

  getInstalledMCPs(): string[] {
    try {
      const config = this.getMCPConfig();
      if (!config.mcpServers) {
        return [];
      }
      return Object.keys(config.mcpServers);
    } catch {
      return [];
    }
  }

  getAllMCPServers(): Record<string, MCPServerConfig> {
    try {
      const config = this.getMCPConfig();
      return config.mcpServers || {};
    } catch {
      return {};
    }
  }
}
export const claudeIntegration = new ClaudeIntegration();
