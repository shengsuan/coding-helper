import { join } from "path";
import { homedir } from "os";
import { getModels } from "./models.js";

export interface ModelModalities {
  input: string[];
  output: string[];
}

export interface Model {
  id: string;
  contextLength: number;
  maxTokens: number;
  modalities?: ModelModalities;
  support_apis?:string[];
}

export interface Plan {
  id: string;
  name: string;
  name_zh: string;
  baseUrl: string;
  anthropicBaseUrl: string;
  apiKeyName: string;
  models: Model[];
  getModels?: Promise<Model[]>;
}

export const PLANS: Record<string, Plan> = {
  "ssy_cp_lite": {
    id: "ssy_cp_lite",
    name: "Lite Plan",
    name_zh: "精简计划",
    baseUrl: "https://router.shengsuanyun.com/api/cp/v1",
    anthropicBaseUrl: "https://router.shengsuanyun.com/api/cp",
    apiKeyName: "Lite Plan API Key",
    getModels: getModels("https://router.shengsuanyun.com/api/cp/v1/models"),
    models: [
      {
        id: "bigmodel/glm-4.7",
        contextLength: 200000,
        maxTokens: 128000,
        modalities: { input: ["text"], output: ["text"] },
      },
      { id: "deepseek/deepseek-v3.2", contextLength: 128000, maxTokens: 32000 },
      {
        id: "moonshot/kimi-k2.5",
        contextLength: 256000,
        maxTokens: 32000,
        modalities: { input: ["text", "image"], output: ["text"] },
      },
    ],
  },
  "ssy_cp_pro": {
    id: "ssy_cp_pro",
    name: "Pro Plan",
    name_zh: "专业计划",
    baseUrl: "https://router.shengsuanyun.com/api/cp/v1",
    anthropicBaseUrl: "https://router.shengsuanyun.com/api/cp",
    apiKeyName: "Pro Plan API Key",
    getModels: getModels("https://router.shengsuanyun.com/api/cp/v1/models"),
    models: [
      {
        id: "google/gemini-2.5-pro",
        contextLength: 200000,
        maxTokens: 128000,
        modalities: { input: ["text"], output: ["text"] },
      },
      {
        id: "moonshot/kimi-k2.5",
        contextLength: 256000,
        maxTokens: 32000,
        modalities: { input: ["text"], output: ["text"] },
      },
    ],
  },
  "ssy_cp_enterprise": {
    id: "ssy_cp_enterprise",
    name: "Enterprise Plan",
    name_zh: "企业计划",
    baseUrl: "https://router.shengsuanyun.com/api/cp/v1",
    anthropicBaseUrl: "https://router.shengsuanyun.com/api/cp",
    apiKeyName: "Enterprise Plan API Key",
    getModels: getModels("https://router.shengsuanyun.com/api/cp/v1/models"),
    models: [
      {
        id: "google/gemini-2.5-pro",
        contextLength: 200000,
        maxTokens: 128000,
        modalities: { input: ["text"], output: ["text"] },
      },
      {
        id: "moonshot/kimi-k2.5",
        contextLength: 256000,
        maxTokens: 32000,
        modalities: { input: ["text"], output: ["text"] },
      },
    ],
  },
  "pay_as_you_go": {
    id: "pay_as_you_go",
    name: "Pay as You Go",
    name_zh: "按量付费",
    baseUrl: "https://router.shengsuanyun.com/api/v1",
    anthropicBaseUrl: "https://router.shengsuanyun.com/api",
    apiKeyName: "ShengSuanYun API Key",
    getModels: getModels("https://router.shengsuanyun.com/api/v1/models"),
    models: [
      {
        id: "google/gemini-3-pro-preview",
        contextLength: 200000,
        maxTokens: 128000,
        modalities: { input: ["text"], output: ["text"] },
      },
      {
        id: "google/gemini-3.1-pro-preview",
        contextLength: 256000,
        maxTokens: 32000,
        modalities: { input: ["text"], output: ["text"] },
      },
      {
        id: "openai/gpt-5.2",
        contextLength: 256000,
        maxTokens: 32000,
        modalities: { input: ["text"], output: ["text"] },
      },
      {
        id: "anthropic/claude-sonnet-4.6",
        contextLength: 256000,
        maxTokens: 32000,
        modalities: { input: ["text"], output: ["text"] },
      },
      {
        id: "x-ai/grok-4-fast",
        contextLength: 256000,
        maxTokens: 32000,
        modalities: { input: ["text"], output: ["text"] },
      },
    ],
  },
};

export interface Tool {
  name: string;
  command: string;
  installCommand: string;
  configPath: string;
  displayName: string;
  runtime: "node" | "python" | "go" | "rust";
  minPythonVersion?: string;
}

export const SUPPORTED_TOOLS: Record<string, Tool> = {
  openclaw: {
    name: "openclaw",
    command: "openclaw",
    installCommand: "npm install -g openclaw",
    configPath: join(homedir(), ".openclaw", "openclaw.json"),
    displayName: "OpenClaw",
    runtime: "node",
  },
  "claude-code": {
    name: "claude-code",
    command: "claude",
    installCommand: "npm install -g @anthropic-ai/claude-code",
    configPath: join(homedir(), ".claude", "settings.json"),
    displayName: "Claude Code",
    runtime: "node",
  },
  opencode: {
    name: "opencode",
    command: "opencode",
    installCommand: "npm install -g opencode-ai",
    configPath: join(homedir(), ".config", "opencode", "opencode.json"),
    displayName: "OpenCode",
    runtime: "node",
  },
  // nanobot: {
  //   name: "nanobot",
  //   command: "nanobot",
  //   installCommand: "pip install nanobot-ai",
  //   configPath: join(homedir(), ".nanobot", "config.json"),
  //   displayName: "Nanobot",
  //   runtime: "python",
  //   minPythonVersion: "3.11",
  // },
  // zeroclaw: {
  //   name: "zeroclaw",
  //   command: "zeroclaw",
  //   installCommand: "brew install zeroclaw",
  //   configPath: join(homedir(), ".zeroclaw", "config.toml"),
  //   displayName: "ZeroClaw",
  //   runtime: "node",
  // },
  picoclaw: {
    name: "picoclaw",
    command: "picoclaw",
    installCommand: "brew install picoclaw",
    configPath: join(homedir(), ".picoclaw", "config.json"),
    displayName: "PicoClaw",
    runtime: "go",
  },
};

export const CONFIG_DIR = join(homedir(), ".coding-helper");
export const CONFIG_PATH = join(CONFIG_DIR, "config.yaml");

export const API_KEY_URLS = {
  "ssy_cp_lite": "https://console.shengsuanyun.com/user/keys",
  "ssy_cp_pro": "https://console.shengsuanyun.com/user/keys",
  "ssy_cp_enterprise": "https://console.shengsuanyun.com/user/keys",
  "pay_as_you_go": "https://console.shengsuanyun.com/user/keys",
};

export const TEA_CONFIG = {
  url: "https://mcs.zijieapi.com/list",
  aid: 940776,
  sdkVersion: "5.3.10",
};
