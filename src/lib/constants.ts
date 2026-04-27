import { join } from "path";
import { homedir } from "os";

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
}

export const PLANS: Record<string, Plan> = {
  "ssy_cp_lite": {
    id: "ssy_cp_lite",
    name: "Lite Plan",
    name_zh: "精简计划",
    baseUrl: "https://router.shengsuanyun.com/api/cp/v1",
    anthropicBaseUrl: "https://router.shengsuanyun.com/api/cp",
    apiKeyName: "Lite Plan API Key",
  },
  "ssy_cp_pro": {
    id: "ssy_cp_pro",
    name: "Pro Plan",
    name_zh: "专业计划",
    baseUrl: "https://router.shengsuanyun.com/api/cp/v1",
    anthropicBaseUrl: "https://router.shengsuanyun.com/api/cp",
    apiKeyName: "Pro Plan API Key",
  },
  "ssy_cp_enterprise": {
    id: "ssy_cp_enterprise",
    name: "Enterprise Plan",
    name_zh: "企业计划",
    baseUrl: "https://router.shengsuanyun.com/api/cp/v1",
    anthropicBaseUrl: "https://router.shengsuanyun.com/api/cp",
    apiKeyName: "Enterprise Plan API Key",
  },
  "pay_as_you_go": {
    id: "pay_as_you_go",
    name: "Pay as You Go",
    name_zh: "按量付费",
    baseUrl: "https://router.shengsuanyun.com/api/v1",
    anthropicBaseUrl: "https://router.shengsuanyun.com/api",
    apiKeyName: "ShengSuanYun API Key",
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
  codex: {
    name: "codex",
    command: "codex",
    installCommand: "npm install -g @openai/codex",
    configPath: join(homedir(), ".codex", "config.toml"),
    displayName: "Codex",
    runtime: "rust",
  },
  claude: {
    name: "claude",
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
  picoclaw: {
    name: "picoclaw",
    command: "picoclaw",
    installCommand: "brew install picoclaw",
    configPath: join(homedir(), ".picoclaw", "config.json"),
    displayName: "PicoClaw",
    runtime: "go",
  },
  aider: {
    name: "aider",
    command: "aider",
    installCommand: "pip install aider-install && aider-install",
    configPath: join(homedir(), ".aider.conf.yml"),
    displayName: "Aider",
    runtime: "python",
    minPythonVersion: "3.10",
  },
  hermes: {
    name: "hermes",
    command: "hermes",
    installCommand: "curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash",
    configPath: join(homedir(), ".hermes", "config.yaml"),
    displayName: "Hermes Agent",
    runtime: "python",
    minPythonVersion: "3.10",
  },
};

export const CONFIG_DIR = join(homedir(), ".coding-helper");
export const CONFIG_PATH = join(CONFIG_DIR, "config.json");

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
