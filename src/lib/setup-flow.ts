import chalk from 'chalk';
import ora from 'ora';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { select, password, confirm, input } from '@inquirer/prompts';
import terminalLink from 'terminal-link';
import { PlanConfig, settings } from './settings.js';
import { registry } from './registry.js';
import { openCodeIntegration } from './opencode-integration.js';
import { nanobotManager } from './nanobot-manager.js';
import { openClawManager } from './openclaw-manager.js';
import { claudeIntegration } from './claude-integration.js';
import { picoclawManager } from './picoclaw-manager.js';
import { aiderManager } from './aider-manager.js';
import { hermesManager } from './hermes-manager.js';  
import { codexManager } from './codex-manager.js';
import { checkCredential } from './auth-checker.js';
import { locale } from './locale.js';
import { execSync } from 'child_process';
import { PLANS, SUPPORTED_TOOLS, API_KEY_URLS, type Model } from './constants.js';
import { logger } from '../utils/logger.js';
import { track } from './tea-tracker.js';
import { UnsupportedModelError, filterSupportedModels } from './model-selector.js';
import { createRequire } from 'module';
import { getModels } from './models.js';
const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../../package.json');

const arkGradient = gradient([
  { color: '#033e71', pos: 0 },
  { color: '#6a5af9', pos: 0.4 },
  { color: '#a855f7', pos: 0.7 },
  { color: '#eb7733', pos: 1 },
]);

const theme = {
  prefix: chalk.cyan('◆'),
  style: { highlight: (text: string) => chalk.cyan(text) },
};

export class SetupFlow {
  private quit(): never {
    console.log(chalk.gray('\n' + locale.t('ui.goodbye_message')));
    process.exit(0);
  }

  private printSectionHeader(title: string): void {
    console.log('\n' + chalk.cyan.bold.underline(title) + '\n');
  }

  private printBanner(): void {
    const termWidth = process.stdout.columns ?? 80;

    if (termWidth >= 76) {
      const bannerText = figlet.textSync('CODING HELPER', {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
      });
      console.log();
      console.log(arkGradient.multiline(bannerText));
    } else {
      console.log();
      console.log(arkGradient('  ═══ CODING HELPER ═══'));
    }

    console.log();
    console.log(
      chalk.gray(`  v${PKG_VERSION}`) +
        chalk.gray(' · ') +
        chalk.white('Configure ShengSuanYun Coding Plan LLM for your AI tools')
    );
    console.log();
  }

  private resetScreen(): void {
    console.clear();
    this.printBanner();
  }

  async runFirstTimeSetup(): Promise<void> {
    this.resetScreen();
    console.log(chalk.cyan.bold('\n' + locale.t('ui.welcome')));
    console.log(chalk.gray(locale.t('ui.privacy_note') + '\n'));

    await this.configLanguage();
    await this.configPlan();
    await this.selectAndConfigureTool();
  }

  private async configLanguage(): Promise<void> {
    while (true) {
      this.resetScreen();
      this.printSectionHeader(locale.t('ui.select_language'));
      const currentLanguage = locale.getLocale();

      const language = await select({
        message: '✨ ' + locale.t('ui.select_language'),
        choices: [
          { name: '[CN] 中文' + (currentLanguage === 'zh_CN' ? chalk.green(' ✓ (' + locale.t('ui.current_active') + ')') : ''), value: 'zh_CN' as const },
          { name: '[EN] English' + (currentLanguage === 'en_US' ? chalk.green(' ✓ (' + locale.t('ui.current_active') + ')') : ''), value: 'en_US' as const },
          { name: '<-  ' + locale.t('ui.nav_return'), value: 'back' as const },
          { name: 'x   ' + locale.t('ui.nav_exit'), value: 'exit' as const },
        ],
        theme,
      });

      if (language === 'exit') {
        this.quit();
      } else if (language === 'back') {
        return;
      }

      settings.setLang(language);
      locale.setLocale(language as 'zh_CN' | 'en_US');
      return;
    }
  }

  private async configPlan(): Promise<void> {
    while (true) {
      this.resetScreen();
      this.printSectionHeader(locale.t('ui.select_plan'));
      const plans = settings.getAllPlans();
      const choices: Array<{ name: string; value: string }> = [];
      for (const plan of plans) {
        choices.push({
          name: `[${plan.label}] ` + (plan.api_key ? chalk.green(' ✓') : ''),
          value: plan.id
        })
      }
      choices.push(
        { name: locale.t('ui.select_both_plans'), value: 'both' },
        { name: locale.t('ui.skip_config'), value: 'skip' },
        { name: '<-  ' + locale.t('ui.nav_return'), value: 'back' },
        { name: 'x   ' + locale.t('ui.nav_exit'), value: 'exit' }
      );

      const planAction = await select({
        message: '🌟 ' + locale.t('ui.select_plan'),
        choices,
        theme,
      });

      if (planAction === 'exit') {
        this.quit();
      } else if (planAction === 'back') {
        return;
      } else if (planAction === 'skip') {
        return;
      } else if (planAction === 'both') {
        await this.configApiKey('ssy_cp_lite');
        await this.configApiKey('ssy_cp_pro');
        await this.configApiKey('ssy_cp_enterprise');
        await this.configApiKey('pay_as_you_go');
        return;
      } else {
        await this.configApiKey(planAction);
        return;
      }
    }
  }

  private async configApiKey(planId: string): Promise<void> {
    const plan = PLANS[planId];
    const customPlan = settings.getPlanConfig(planId) as PlanConfig | undefined;
    if (!plan && !customPlan) {
      console.log(chalk.red(`\n未知的计划 ID: ${planId}`));
      return;
    }
    const planDisplayName = plan ? plan.name_zh : (customPlan?.label || planId);
    const isCustomPlan = !plan && customPlan;
    while (true) {
      this.resetScreen();
      this.printSectionHeader(locale.t('ui.config_api_key') + ` - ${planDisplayName}`);
      const currentConfig = settings.getPlanConfig(planId) as PlanConfig | undefined;
      if (currentConfig?.api_key) {
        console.log(chalk.gray('  ' + locale.t('ui.config_api_key') + ' ') +
          chalk.gray(locale.t('ui.api_key_set') + ' (' + currentConfig.api_key.slice(0, 6) + '…)'));
        console.log('');
      }
      if (!isCustomPlan) {
        const apiKeyUrl = API_KEY_URLS[planId as keyof typeof API_KEY_URLS];
        const clickableUrl = terminalLink(apiKeyUrl, apiKeyUrl, { fallback: () => apiKeyUrl });
        console.log(chalk.blue('💡 ' + locale.t('ui.api_key_get_hint', { url: clickableUrl })));
        console.log('');
      } else {
        console.log(chalk.gray(`  端点: ${currentConfig?.base_url || 'N/A'}`));
        console.log(chalk.gray(`  模型: ${currentConfig?.model || 'N/A'}`));
        console.log('');
      }

      const choices: { name: string; value: 'model' | 'input' | 'delete' | 'back' | 'exit' }[] = [];
      if (currentConfig?.api_key) {
        choices.push({ name: '>   ' + locale.t('ui.switch_model'), value: 'model' });
      }
      choices.push(
        { name: '>   ' + (currentConfig?.api_key ? locale.t('ui.update_api_key') : locale.t('ui.input_api_key')), value: 'input' },
        { name: '>   ' + "删除", value: 'delete' },
        { name: '<-  ' + locale.t('ui.nav_return'), value: 'back' },
        { name: 'x   ' + locale.t('ui.nav_exit'), value: 'exit' },
      );

      const action = await select({
        message: locale.t('ui.select_action'),
        choices,
        theme,
      });

      if (action === 'exit') {
        this.quit();
      } else if (action === 'back') {
        return;
      } else if (action === 'model') {
        await this.selectModel(planId);
        return;
      } else if (action === 'delete') {
        settings.removeCustomPlan(planId)
        return;
      } else if (action === 'input') {
        this.resetScreen();
        this.printSectionHeader(locale.t('ui.config_api_key') + ` - ${planDisplayName}`);
        if (!isCustomPlan) {
          const apiKeyUrl = API_KEY_URLS[planId as keyof typeof API_KEY_URLS];
          const clickableUrl = terminalLink(apiKeyUrl, apiKeyUrl, { fallback: () => apiKeyUrl });
          console.log(chalk.blue('💡 ' + locale.t('ui.api_key_get_hint', { url: clickableUrl })));
        }
        console.log('');

        const apiKey = await password({
          message: locale.t('ui.input_api_key'),
          mask: '*',
          validate: (input: string) => {
            if (!input || input.trim().length === 0) {
              return '[!] ' + locale.t('ui.api_key_required');
            }
            return true;
          },
          theme,
        });

        if (!isCustomPlan) {
          const spinner = ora({
            text: locale.t('ui.validating_api_key'),
            spinner: 'dots'
          }).start();

          const validationResult = await checkCredential(apiKey.trim(), planId);
          if (!validationResult.valid) {
            if (validationResult.error === 'invalid_api_key') {
              spinner.fail(chalk.red(locale.t('ui.api_key_invalid')));
            } else {
              spinner.fail(chalk.red(locale.t('ui.api_key_network_error')));
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          settings.setApiKey(planId, apiKey.trim());
          track('set_apikey');
          spinner.succeed(locale.t('ui.set_success'));
        } else {
          settings.setApiKey(planId, apiKey.trim());
          console.log(chalk.green('\n✓ ' + locale.t('ui.set_success')));
        }

        await this.selectModel(planId);
        return;
      }
    }
  }

  private async selectModel(planId: string, requiredApi?: string[]): Promise<void> {
    const plan = PLANS[planId];
    const customPlan = settings.getPlanConfig(planId) as PlanConfig | undefined;
    if (!plan && !customPlan) {
      console.log(chalk.red(`\n未知的计划 ID: ${planId}`));
      return;
    }
    const planDisplayName = plan ? plan.name_zh : (customPlan?.label || planId);
    const isCustomPlan = !plan && customPlan;

    if (isCustomPlan) {
      this.resetScreen();
      this.printSectionHeader(locale.t('ui.select_model') + ` - ${planDisplayName}`);

      if (customPlan?.model) {
        console.log(chalk.gray(`  当前模型: ${customPlan.model}`));
        console.log('');

        const shouldUpdate = await confirm({
          message: '是否更新模型配置？',
          default: false,
          theme,
        });

        if (!shouldUpdate) {
          return;
        }
      }

      const newModel = await input({
        message: '输入新的模型 ID：',
        default: customPlan?.model || '',
        validate: (val) => val.trim() ? true : '必须提供模型 ID',
        theme,
      });

      if (newModel.trim()) {
        settings.setModel(planId, newModel.trim());
        console.log(chalk.green('\n✓ 模型已更新'));
      }
      return;
    }
    const models = await getModels(planId);

    const availableModels = requiredApi ? filterSupportedModels(models, requiredApi) : models;
    if (availableModels.length === 0) {
      console.log(chalk.red(`\n[!] No models support required API: ${requiredApi}`));
      return;
    }

    this.resetScreen();
    this.printSectionHeader(locale.t('ui.select_model') + ` - ${planDisplayName}`);

    const modelChoices = availableModels.map((model: Model) => ({
      name: `${model.id} (${Math.floor(model.contextLength / 1000)}K)`,
      value: model.id
    }));

    const model = await select({
      message: locale.t('ui.select_default_model'),
      choices: modelChoices,
      default: availableModels[0].id,
      pageSize: 10,
      theme,
    }) as string;

    settings.setModel(planId, model);
    track('change_model');
  }

  private async selectAndConfigureTool(): Promise<void> {
    while (true) {
      this.resetScreen();
      this.printSectionHeader(locale.t('ui.select_tool'));

      const toolChoices = registry.getSupportedTools().map(tool => ({
        name: `>  ${tool.displayName} ${registry.isToolInstalled(tool.name) ? chalk.green('✓') : chalk.yellow('(未安装)')}`,
        value: tool.name
      }));

      toolChoices.push(
        { name: '<-  ' + locale.t('ui.nav_return'), value: 'back' },
        { name: 'x   ' + locale.t('ui.nav_exit'), value: 'exit' }
      );

      const selectedTool = await select({
        message: locale.t('ui.select_tool'),
        choices: toolChoices,
        theme,
      });

      if (selectedTool === 'exit') {
        this.quit();
      } else if (selectedTool === 'back') {
        return;
      }
      await this.configureTool(selectedTool);
    }
  }

  private async configureTool(toolName: string): Promise<void> {
    const tool = SUPPORTED_TOOLS[toolName];
    if (!tool) return;

    if (!registry.isToolInstalled(toolName)) {
      console.log(chalk.yellow(`\n${locale.t('ui.tool_not_installed', { tool: tool.displayName })}`));

      const shouldInstall = await confirm({
        message: locale.t('ui.install_tool_confirm'),
        default: true,
        theme,
      });

      if (shouldInstall) {
        try {
          await registry.installTool(toolName);
          await this.runPostInstallSteps(toolName, tool.displayName);
        } catch (error) {
          logger.logError('SetupFlow.configureTool', error);
          console.error(chalk.red(locale.t('setup.install_failed_detail')));
          if (error instanceof Error && error.message) {
            console.error(chalk.gray(error.message));
          }
          await input({ message: locale.t('ui.press_enter_back'), theme });
          return;
        }
      } else {
        console.log(chalk.yellow(locale.t('ui.install_skipped')));
        return;
      }
    }
    await this.showToolMenu(toolName);
  }

  private async runPostInstallSteps(toolName: string, displayName: string): Promise<void> {
    const postInstallSteps: Record<string, Array<{ command: string; description: string }>> = {
      'openclaw': [
        { command: 'openclaw gateway install', description: `${displayName} gateway installed` },
        { command: 'openclaw gateway start', description: `${displayName} gateway started` },
      ],
    };

    const steps = postInstallSteps[toolName];
    if (!steps) return;

    for (const step of steps) {
      const spinner = ora({
        text: step.description.replace('installed', 'Installing').replace('started', 'Starting'),
        spinner: 'dots',
      }).start();

      try {
        execSync(step.command, { stdio: 'pipe' });
        spinner.succeed(chalk.green(step.description));
      } catch (error) {
        spinner.fail(chalk.red(step.description.replace('installed', 'install failed').replace('started', 'start failed')));
        logger.logError(`SetupFlow.postInstall.${toolName}`, error);
      }
    }
  }

  async showMainMenu(): Promise<void> {
    const cfg = settings.getConfig();
    locale.loadFromConfig(cfg.lang);
    const actionHandlers: Record<string, () => Promise<void>> = {
      'exit': async () => this.quit(),
      'lang': async () => await this.configLanguage(),
      'plan': async () => await this.configPlan(),
      'tool': async () => await this.selectAndConfigureTool(),
    };

    while (true) {
      this.resetScreen();
      console.log(chalk.gray('  ' + locale.t('ui.main_menu_title')));

      const toolsToDisplay = Object.values(SUPPORTED_TOOLS);
      for (const tool of toolsToDisplay) {
        const description = this.getToolDescription(tool.name);
        console.log(
          chalk.cyan('    ◆ ') +
          chalk.white(tool.displayName.padEnd(20, ' ')) +
          chalk.gray(`— ${description}`)
        );
      }
      console.log();

      const allPlans = settings.getAllPlans();

      if (allPlans.length > 0) {
        const predefinedPlans = allPlans.filter(p => !p.is_custom);
        const customPlans = allPlans.filter(p => p.is_custom);
        if (predefinedPlans.length > 0) {
          const planStatusParts: string[] = [];
          for (const plan of predefinedPlans) {
            planStatusParts.push(
              chalk.gray(`  ${plan.label}: `) +
              (plan.api_key
                ? chalk.green(`✓ (${plan.api_key.slice(0, 6)}…)`)
                : chalk.red('✗'))
            );
          }
          console.log(planStatusParts.join(''));
        }
        if (customPlans.length > 0) {
          console.log();
          console.log(chalk.cyan.bold('  自定义计划:'));
          for (const plan of customPlans) {
            console.log(
              chalk.gray(`    • ${plan.label || plan.id}: `) +
              (plan.api_key
                ? chalk.green(`✓ ${plan.base_url}`)
                : chalk.red('✗')) +
              chalk.gray(` (${plan.model || 'N/A'})`)
            );
          }
        }
      } else {
        console.log(chalk.yellow('  尚未配置任何计划'));
      }
      console.log();
      const action = await select({
        message: locale.t('ui.select_operation'),
        choices: [
          {
            name: locale.t('ui.menu_select_plan'),
            value: 'plan',
            description: locale.t('ui.select_plan')
          },
          {
            name: locale.t('ui.menu_config_tool'),
            value: 'tool',
            description: locale.t('ui.select_tool')
          },
          {
            name: locale.t('ui.menu_config_language'),
            value: 'lang',
            description: locale.t('ui.select_language')
          },
          {
            name: locale.t('ui.menu_exit'),
            value: 'exit'
          },
        ],
        theme,
      });

      const handler = actionHandlers[action];
      if (handler) {
        await handler();
        if (action === 'exit') return;
      }
    }
  }

  private getToolDescription(toolName: string): string {
    const descriptions: Record<string, string> = {
      'openclaw': 'AI coding gateway',
      'claude': 'AI coding assistant',
      'opencode': 'Open-source coding tool',
      'picoclaw': 'AI coding tool',
      'codex': 'AI coding tool',
      'aider': 'AI pair programming',
      'hermes': 'AI agent framework',
      'nanobot': 'AI agent framework',
    };
    return descriptions[toolName] || 'AI coding tool';
  }

  async showToolMenu(toolName: string): Promise<void> {
    const tool = SUPPORTED_TOOLS[toolName];
    if (!tool) return;
    const plans = settings.getAllPlans();
    const planDisplayNames: Record<string, string> = {
      'ssy_cp_lite': locale.t('ui.plan_lite'),
      'ssy_cp_pro': locale.t('ui.plan_pro'),
      'ssy_cp_enterprise': locale.t('ui.plan_enterprise'),
      'pay_as_you_go': locale.t('ui.plan_go'),
    };
    const actionHandlers: Record<string, () => Promise<void>> = {
      'exit': async () => this.quit(),
      'back': async () => {},
      'unload': async () => await this.unloadPlanConfig(toolName),
      'start': async () => await this.startTool(toolName),
    };

    while (true) {
      this.resetScreen();
      this.printSectionHeader(`${tool.displayName} ${locale.t('ui.main_menu_title')}`);
      const detectedConfig = this.detectToolConfig(toolName);
      console.log(chalk.cyan.bold('📋 ' + locale.t('ui.current_config_status') + ':'));
      for (const plan of plans) {
        console.log(chalk.gray(` [${plan.label}]: `) +
          (plan?.api_key
            ? chalk.green('✓ ' + (plan.model || 'anthropic/claude-sonnet-4.6'))
            : chalk.red(locale.t('ui.not_set'))));
      }
      console.log('');
      console.log(chalk.yellow.bold(`📋 ${tool.displayName} ` + locale.t('ui.current_config_status') + ':'));
      if (detectedConfig.plan) {
        const planConfig = settings.getPlanConfig(detectedConfig.plan) as PlanConfig | undefined;
        const planName = planConfig?.label || planDisplayNames[detectedConfig.plan] || detectedConfig.plan;
        console.log(chalk.gray('  ' + locale.t('ui.config_plan') + ': ') + chalk.green(planName));
        if (detectedConfig.apiKey) {
          console.log(chalk.gray('  API Key: ') + chalk.gray(locale.t('ui.api_key_set') + ' (' + detectedConfig.apiKey.slice(0, 6) + '…)'));
        }
      } else {
        console.log(chalk.gray('  ' + locale.t('ui.config_plan') + ': ') + chalk.red(locale.t('ui.not_set')));
      }
      console.log('');

      const choices: Array<{ name: string; value: string }> = [];
      for (const plan of plans) {
        if (plan.api_key) {
          const isActive = detectedConfig.plan === plan.id;
          choices.push({
            name: `${isActive ? '🔄' : '📥'} 设置 [${plan.label}] 配置到 ${tool.displayName}`,
            value: `load_${plan.id}`
          });
        }
      }

      if (detectedConfig.plan) {
        choices.push({ name: `🗑️  卸载 ${tool.displayName} 配置`, value: 'unload' });

        if (toolName === 'opencode' || toolName === 'claude') {
          choices.push({ name: `🚀 启动 ${tool.displayName} (${tool.command})`, value: 'start' });
        }
      }

      choices.push(
        { name: '<-  ' + locale.t('ui.nav_return'), value: 'back' },
        { name: 'x   ' + locale.t('ui.nav_exit'), value: 'exit' }
      );

      const action = await select({
        message: locale.t('ui.select_action'),
        choices,
        theme,
      });

      if (action === 'back') {
        return; 
      }

      if (action in actionHandlers) {
        await actionHandlers[action]();
        if (action === 'exit') return; // exit 后也要返回
      } else if (action.startsWith('load_')) {
        const planId = action.replace('load_', '');
        await this.loadPlanConfig(toolName, planId);
      }
    }
  }

  private detectToolConfig(toolName: string): { plan: string | null; apiKey: string | null } {
    const toolManagers: Record<string, { detectCurrentConfig: () => { plan: string | null; apiKey: string | null } }> = {
      'opencode': openCodeIntegration,
      'claude': claudeIntegration,
      'nanobot': nanobotManager,
      'openclaw': openClawManager,
      'picoclaw': picoclawManager,
      'aider': aiderManager,
      'codex': codexManager,
      'hermes': hermesManager,
    };

    const manager = toolManagers[toolName];
    return manager ? manager.detectCurrentConfig() : { plan: null, apiKey: null };
  }

  private async loadPlanConfig(toolName: string, planId: string): Promise<void> {
    const tool = SUPPORTED_TOOLS[toolName];
    if (!tool) return;
    const plan = PLANS[planId];
    const config = settings.getPlanConfig(planId);

    if (!config?.api_key) {
      console.log(chalk.red('\n[!] ' + locale.t('ui.missing_config')));
      await new Promise(resolve => setTimeout(resolve, 3000));
      return;
    }
    const planToLoad = plan || {
      id: planId,
      name: config.label || planId,
      name_zh: config.label || planId,
      baseUrl: config.base_url || '',
      anthropicBaseUrl: (config.base_url || '').replace(/\/v1$/, ''),
      apiKeyName: 'Custom API Key',
    };

    const spinner = ora({
      text: locale.t('ui.loading_config'),
      spinner: 'dots'
    }).start();

    try {
      await registry.loadPlanConfig(toolName, planToLoad, config.api_key, config.model);
      spinner.succeed(chalk.green(locale.t('ui.config_loaded', { tool: tool.displayName })));
    } catch (error) {
      spinner.fail(locale.t('ui.config_failed'));

      if (error instanceof UnsupportedModelError) {
        console.log(chalk.yellow(`\n[!] ${locale.t('ui.model_not_supported', { model: error.modelId })}`));
        console.log(chalk.yellow(`    ${locale.t('ui.please_select_supported_model')}`));
        await new Promise(resolve => setTimeout(resolve, 3000));
        await this.selectModel(planId, error.requiredApi);
        await this.loadPlanConfig(toolName, planId);
      } else {
        logger.logError('SetupFlow.loadPlanConfig', error);
        console.error(error);
      }
    }
  }

  private async unloadPlanConfig(toolName: string): Promise<void> {
    const tool = SUPPORTED_TOOLS[toolName];
    if (!tool) return;

    const shouldUnload = await confirm({
      message: locale.t('ui.confirm_unload', { tool: tool.displayName }),
      default: false,
      theme,
    });

    if (!shouldUnload) return;

    const spinner = ora({
      text: locale.t('ui.unloading_config'),
      spinner: 'dots'
    }).start();

    try {
      registry.unloadPlanConfig(toolName);
      spinner.succeed(chalk.green(locale.t('ui.config_unloaded')));
    } catch (error) {
      logger.logError('SetupFlow.unloadPlanConfig', error);
      spinner.fail(locale.t('ui.config_unload_failed'));
      console.error(error);
    }
  }

  private async startTool(toolName: string): Promise<void> {
    const tool = SUPPORTED_TOOLS[toolName];
    if (!tool) return;
    let fullCommand = tool.command;
    console.log(chalk.gray('$ ') + chalk.white(fullCommand));
    const spinner = ora({
      text: locale.t('ui.starting_tool'),
      spinner: 'dots'
    }).start();

    try {
      execSync(fullCommand, { stdio: 'inherit' });
      spinner.succeed(locale.t('ui.tool_started'));
    } catch (error) {
      logger.logError('SetupFlow.startTool', error);
      spinner.fail(locale.t('ui.tool_start_failed'));
      throw error;
    }
  }
}

export const setupFlow = new SetupFlow();
