import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { PLANS, type Plan } from "./constants.js";
import { logger } from "../utils/logger.js";

interface OpenClawModel {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
  input?: string[];
}

interface OpenClawProvider {
  baseUrl: string;
  apiKey?: string;
  api: string;
  models: OpenClawModel[];
}

interface OpenClawConfig {
  models?: {
    providers?: Record<string, OpenClawProvider>;
  };
  agents?: {
    defaults?: {
      model?: {
        primary?: string;
      };
    };
  };
  [key: string]: unknown;
}

interface AuthProfile {
  provider: string;
  type: string;
  key: string;
}

interface AuthProfilesConfig {
  profiles?: Record<string, AuthProfile>;
  [key: string]: unknown;
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

interface SessionEntry {
  modelOverride?: string;
  providerOverride?: string;
  model?: string;
  modelProvider?: string;
  contextTokens?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

type SessionStore = Record<string, SessionEntry>;

export class OpenClawManager {
  mainPath = join( homedir(),".openclaw","agents","main");
  private modelsPath = join(this.mainPath, "agent", "models.json");
  private configPath = join(homedir(), ".openclaw", "openclaw.json");
  private authPath = join(this.mainPath, "agent", "auth-profiles.json");
  private sessionsPath = join(this.mainPath, "sessions","sessions.json");

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  getConfig(): OpenClawConfig | null {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("Failed to read OpenClaw config:", error);
      logger.logError("OpenClawManager.getConfig", error);
    }
    return null;
  }

  getModels(): { providers?:Record<string, OpenClawProvider>} | null {
    try {
      if (existsSync(this.modelsPath)) {
        const content = readFileSync(this.modelsPath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("Failed to read OpenClaw config:", error);
      logger.logError("OpenClawManager.getConfig", error);
    }
    return null;
  }

  private saveModels(models: { providers?:Record<string, OpenClawProvider>}): void {
    try {
      this.ensureDir(this.modelsPath);
      writeFileSync(this.modelsPath, JSON.stringify(models, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save OpenClaw config: ${error}`);
    }
  }

  private getAuthConfig(): AuthProfilesConfig | null {
    try {
      if (existsSync(this.authPath)) {
        const content = readFileSync(this.authPath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("Failed to read OpenClaw auth config:", error);
      logger.logError("OpenClawManager.getAuthConfig", error);
    }
    return null;
  }

  private saveConfig(config: OpenClawConfig): void {
    try {
      this.ensureDir(this.configPath);
      writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save OpenClaw config: ${error}`);
    }
  }

  private saveAuthConfig(auth: AuthProfilesConfig): void {
    try {
      this.ensureDir(this.authPath);
      writeFileSync(this.authPath, JSON.stringify(auth, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save OpenClaw auth config: ${error}`);
    }
  }

  private getSessionStore(): SessionStore | null {
    try {
      if (existsSync(this.sessionsPath)) {
        const content = readFileSync(this.sessionsPath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      logger.logError("OpenClawManager.getSessionStore", error);
    }
    return null;
  }

  private saveSessionStore(store: SessionStore): void {
    try {
      this.ensureDir(this.sessionsPath);
      writeFileSync(this.sessionsPath, JSON.stringify(store, null, 2), "utf-8");
    } catch (error) {
      logger.logError("OpenClawManager.saveSessionStore", error);
    }
  }

  private updateSessionOverrides(planId: string, model: string): void {
    const store = this.getSessionStore();
    if (!store) return;

    let updated = false;
    for (const entry of Object.values(store)) {
      entry.providerOverride = planId;
      entry.modelOverride = model;
      // Clear stale runtime fields so OpenClaw re-resolves on next run
      delete entry.model;
      delete entry.modelProvider;
      delete entry.contextTokens;
      entry.updatedAt = Date.now();
      updated = true;
    }

    if (updated) {
      this.saveSessionStore(store);
    }
  }

  private getDomainFromUrl(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  }

  loadPlanConfig(plan: Plan, apiKey: string, model?: string): void {
    const currentConfig = this.getConfig() || {};
    const currentAuth = this.getAuthConfig() || {};

    const models: OpenClawModel[] = []
    for(const m of plan.models){
      const input = m.modalities?.input?.filter(
        (item) => item === "text" || item === "image"
      );
      if (m.contextLength <1 || m.maxTokens<1 || !input?.length){
        continue
      }
      const entry: OpenClawModel = {
        id: m.id,
        name: m.id,
        contextWindow: m.contextLength,
        maxTokens: m.maxTokens,
      };
      entry.input = input;
      models.push(entry);
    }

    const provider: OpenClawProvider = {
      baseUrl: plan.baseUrl,
      apiKey: apiKey,
      api: "openai-completions",
      models,
    };

    const selectedModel = model || plan.models[0].id;

    // Clean up old custom providers sharing the same domain (e.g. from openclaw onboard)
    const providers = { ...(currentConfig.models?.providers || {}) };
    const planDomain = this.getDomainFromUrl(plan.baseUrl);
    const removedProviderIds: string[] = [];

    for (const [id, p] of Object.entries(providers)) {
      if (id === plan.id) continue;
      if (
        planDomain &&
        this.getDomainFromUrl((p as OpenClawProvider).baseUrl) === planDomain
      ) {
        removedProviderIds.push(id);
        delete providers[id];
      }
    }
    providers[plan.id] = provider;

    // Clean up model catalog entries referencing removed providers,
    // and always inject all plan models into the catalog (allowlist in OpenClaw).
    // Aligns with OpenClaw's own applyPrimaryModel behavior for consistent /model switching.
    const defaults = { ...(currentConfig.agents?.defaults || {}) } as Record<
      string,
      unknown
    >;
    const modelsCatalog: Record<string, unknown> =
      defaults.models && typeof defaults.models === "object"
        ? { ...(defaults.models as Record<string, unknown>) }
        : {};

    // Remove entries belonging to providers we just cleaned up
    for (const key of Object.keys(modelsCatalog)) {
      if (removedProviderIds.some((id) => key.startsWith(`${id}/`))) {
        delete modelsCatalog[key];
      }
    }

    // Add all plan models so the user can freely /model switch inside OpenClaw
    for (const m of plan.models) {
      const ref = `${plan.id}/${m.id}`;
      if (!(ref in modelsCatalog)) {
        modelsCatalog[ref] = {};
      }
    }

    defaults.models = modelsCatalog;

    const newConfig: OpenClawConfig = {
      ...currentConfig,
      models: {
        ...(currentConfig.models || {}),
        providers,
      },
      agents: {
        ...(currentConfig.agents || {}),
        defaults: {
          ...defaults,
          model: {
            primary: `${plan.id}/${selectedModel}`,
          },
        },
      },
    };

    const profileKey = `${plan.id}:default`;
    const newAuth: AuthProfilesConfig = {
      ...currentAuth,
      profiles: {
        ...(currentAuth.profiles || {}),
        [profileKey]: {
          type: "api_key",
          provider: plan.id,
          key: apiKey,
        },
      },
    };
    const currentModels :{ providers? :Record<string, OpenClawProvider>} = this.getModels() || {}
    const newModels = {
      providers:{
        ...currentModels.providers,
        ...providers
      }
    }
    this.saveConfig(newConfig);
    this.saveModels(newModels);
    this.saveAuthConfig(newAuth);
    this.updateSessionOverrides(plan.id, selectedModel);
  }

  unloadPlanConfig(planId?: string): void {
    const currentConfig = this.getConfig();
    const currentAuth = this.getAuthConfig();

    if (currentConfig?.models?.providers) {
      if (planId) {
        delete currentConfig.models.providers[planId];
      } else {
        delete currentConfig.models.providers["ssy_cp_lite"];
        delete currentConfig.models.providers["ssy_cp_pro"];
        delete currentConfig.models.providers["ssy_cp_enterprise"];
        delete currentConfig.models.providers["pay_as_you_go"];
      }

      if (Object.keys(currentConfig.models.providers).length === 0) {
        delete currentConfig.models.providers;
      }

      if (currentConfig.agents?.defaults?.model?.primary) {
        const primary = currentConfig.agents.defaults.model.primary;
        if (
          !planId ||
          primary.startsWith(`${planId}/`) ||
          !currentConfig.models.providers
        ) {
          delete currentConfig.agents.defaults.model;
        }
      }

      this.saveConfig(currentConfig);
    }

    if (currentAuth?.profiles) {
      if (planId) {
        delete currentAuth.profiles[`${planId}:default`];
      } else {
        delete currentAuth.profiles["ssy_cp_lite:default"];
        delete currentAuth.profiles["ssy_cp_pro:default"];
        delete currentAuth.profiles["ssy_cp_enterprise:default"];
        delete currentAuth.profiles["pay_as_you_go:default"];
      }

      if (Object.keys(currentAuth.profiles).length === 0) {
        delete currentAuth.profiles;
      }

      this.saveAuthConfig(currentAuth);
    }
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const config = this.getConfig();
      const auth = this.getAuthConfig();

      if (!config?.models?.providers) {
        return { plan: null, apiKey: null };
      }

      // Prefer the plan that primary model points to
      const primary = config.agents?.defaults?.model?.primary;
      if (primary) {
        const primaryPlanId = primary.split("/")[0];
        if (config.models.providers[primaryPlanId]) {
          const profileKey = `${primaryPlanId}:default`;
          const apiKey = auth?.profiles?.[profileKey]?.key || null;
          return { plan: primaryPlanId, apiKey };
        }
      }

      // Fallback: return the first configured plan
      for (const planId of ["ssy_cp_lite", "ssy_cp_pro"]) {
        if (config.models.providers[planId]) {
          const profileKey = `${planId}:default`;
          const apiKey = auth?.profiles?.[profileKey]?.key || null;
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

export const openClawManager = new OpenClawManager();
