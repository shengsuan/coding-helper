export { openCodeIntegration } from './opencode.js';
export { nanobotManager } from './nanobot.js';
export { openClawManager } from './openclaw.js';
export { claudeIntegration } from './claude.js';
export { picoclawManager } from './picoclaw.js';
export { aiderManager } from './aider.js';
export { hermesManager } from './hermes.js';
export { codexManager } from './codex.js';
export { deepSeekManager, DeepSeekModelError } from './deepseek.js';
export { openCodeReviewManager } from './opencodereview.js';

import { openCodeIntegration } from './opencode.js';
import { nanobotManager } from './nanobot.js';
import { openClawManager } from './openclaw.js';
import { claudeIntegration } from './claude.js';
import { picoclawManager } from './picoclaw.js';
import { aiderManager } from './aider.js';
import { hermesManager } from './hermes.js';
import { codexManager } from './codex.js';
import { deepSeekManager } from './deepseek.js';
import { openCodeReviewManager } from './opencodereview.js';
import { type Plan } from '../lib/constants.js';

export interface ToolManager {
  loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> | void;
  unloadPlanConfig(planId?: string): void;
  detectCurrentConfig(): { plan: string | null; apiKey: string | null };
}

export const toolManagers: Record<string, ToolManager> = {
  opencode: openCodeIntegration,
  claude: claudeIntegration,
  nanobot: nanobotManager,
  openclaw: openClawManager,
  picoclaw: picoclawManager,
  aider: aiderManager,
  codex: codexManager,
  hermes: hermesManager,
  deepseek: deepSeekManager,
  opencodereview: openCodeReviewManager,
};
