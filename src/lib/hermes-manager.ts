import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { Document, parseDocument } from 'yaml';
import { validateModelSupport } from './model-selector.js';
import { type Plan } from './constants.js';
import { getModels } from './models.js';
import { logger } from '../utils/logger.js';

export interface HermesConfigShape {
  model: {
    default: string;
    provider: string;
    api_key: string;
    base_url: string;
    [key: string]: string;
  };
  [key: string]: unknown;
}

interface DetectedConfig {
  plan: string | null;
  apiKey: string | null;
}

export class HermesManager {
  private configsPath: string;

  constructor() {
    this.configsPath = join(homedir(), '.hermes', 'config.yaml');
  }

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  getConfigs(): Document {
    try {
      if (existsSync(this.configsPath)) {
        const content = readFileSync(this.configsPath, 'utf-8');
        return parseDocument(content);
      }
    } catch (error) {
      logger.logError('HermesManager.getConfigs', error);
    }
    return new Document({});
  }

  saveConfigs(config: Document): void {
    try {
      this.ensureDir(this.configsPath);
      writeFileSync(this.configsPath, config.toString(), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save Hermes config: ${error}`);
    }
  }

  async loadPlanConfig(plan: Plan, apiKey: string, model?: string): Promise<void> {
    const currentConfigs = this.getConfigs();
    const models = await getModels(plan.id);
    const selectedModelId = validateModelSupport(
      models,
      model || models[0]?.id,
      ['/v1/chat/completions'],
      'hermes'
    );

    const existingModel = currentConfigs.get('model');
    const isValidObject = existingModel &&
                          typeof existingModel === 'object' &&
                          'has' in existingModel &&
                          typeof (existingModel as any).has === 'function';

    if (!isValidObject) {
      const modelNode = currentConfigs.createNode({});
      currentConfigs.set('model', modelNode);
    }

    currentConfigs.setIn(['model', 'ssy_code_plan'], plan.id);
    currentConfigs.setIn(['model', 'provider'], 'custom');

    const apiKeyNode = currentConfigs.createNode(apiKey);
    if (apiKeyNode && typeof apiKeyNode === 'object' && 'type' in apiKeyNode) {
      (apiKeyNode as any).type = 'PLAIN';
    }
    currentConfigs.setIn(['model', 'api_key'], apiKeyNode);

    currentConfigs.setIn(['model', 'base_url'], plan.baseUrl);
    currentConfigs.setIn(['model', 'default'], selectedModelId);
    this.saveConfigs(currentConfigs);
  }

  unloadPlanConfig(): void {
    const currentConfigs = this.getConfigs();
    const plan = currentConfigs.getIn(['model', 'ssy_code_plan']);
    if (!plan) return;

    currentConfigs.deleteIn(['model', 'ssy_code_plan']);

    const apiBase = currentConfigs.getIn(['model', 'base_url']);
    if (typeof apiBase === 'string' && apiBase.includes('shengsuanyun')) {
      currentConfigs.setIn(['model', 'api_key'], '');
      currentConfigs.setIn(['model', 'base_url'], '');
    }

    this.saveConfigs(currentConfigs);
  }

  detectCurrentConfig(): DetectedConfig {
    try {
      const currentConfigs = this.getConfigs();
      const plan = currentConfigs.getIn(['model', 'ssy_code_plan']);
      const apiKey = currentConfigs.getIn(['model', 'api_key']);
      if (typeof plan !== 'string') {
        return { plan: null, apiKey: null };
      }
      return {
        plan,
        apiKey: typeof apiKey === 'string' ? apiKey : null
      };
    } catch (error) {
      logger.logError('HermesManager.detectCurrentConfig', error);
      return { plan: null, apiKey: null };
    }
  }
}

export const hermesManager = new HermesManager();
