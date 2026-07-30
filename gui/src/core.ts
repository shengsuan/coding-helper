import { invoke } from '@tauri-apps/api/core';

export interface Plan {
  id: string;
  name: string;
  name_zh: string;
  base_url?: string;
  model?: string;
  api_key_name?: string;
  apiKeyConfigured: boolean;
  removable: boolean;
}

export interface Tool {
  name: string;
  command: string;
  installCommand: string;
  configPath: string;
  displayName: string;
  runtime: string;
  minPythonVersion?: string;
  installed: boolean;
  configuredPlan: string | null;
}

export interface Overview {
  plans: Plan[];
  tools: Tool[];
  language: string;
}

async function action<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  return invoke<T>('core_action', { action, payload });
}

export const core = {
  overview: () => action<Overview>('overview'),
  setLanguage: (language: 'zh_CN' | 'en_US') => action<string>('set-language', { language }),
  models: (planId: string) => action<Array<{ id: string }>>('models', { planId }),
  savePlan: (planId: string, apiKey?: string, model?: string) =>
    action<Plan>('save-plan', { planId, apiKey, model }),
  revokePlan: (planId: string) => action<Plan>('revoke-plan', { planId }),
  addPlan: (label: string, baseUrl: string, model?: string) =>
    action<Plan>('add-plan', { label, baseUrl, model }),
  deletePlan: (planId: string) => action<string>('delete-plan', { planId }),
  applyTool: (toolName: string, planId: string) => action<Tool>('apply-tool', { toolName, planId }),
  removeToolConfig: (toolName: string) => action<Tool>('remove-tool-config', { toolName }),
  binaryPath: () => invoke<string>('core_binary_path'),
};
