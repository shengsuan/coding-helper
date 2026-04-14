import chalk from 'chalk';
import ora from 'ora';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { select, password, confirm, input } from '@inquirer/prompts';
import terminalLink from 'terminal-link';
import { settings } from './settings.js';
import { registry } from './registry.js';
import { openCodeIntegration } from './opencode-integration.js';
import { nanobotManager } from './nanobot-manager.js';
import { zeroClawManager } from './zeroclaw-manager.js';
import { openClawManager } from './openclaw-manager.js';
import { claudeIntegration } from './claude-integration.js';
import { picoclawManager } from './picoclaw-manager.js';
import { aiderManager } from './aider-manager.js';
import { codexManager } from './codex-manager.js';
import { checkCredential } from './auth-checker.js';
import { locale } from './locale.js';
import { execSync, spawnSync } from 'child_process';
import { PLANS, SUPPORTED_TOOLS, API_KEY_URLS, type Model } from './constants.js';
import { logger } from '../utils/logger.js';
import { track } from './tea-tracker.js';
import { UnsupportedModelError, filterSupportedModels } from './model-selector.js';
import { createRequire } from 'module';

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

      const litePlanConfig = settings.getPlanConfig('ssy_cp_lite');
      const proPlanConfig = settings.getPlanConfig('ssy_cp_pro');
      const enterprisePlanConfig = settings.getPlanConfig('ssy_cp_enterprise');
      const goPlanConfig = settings.getPlanConfig('pay_as_you_go');

      const planAction = await select({
        message: '🌟 ' + locale.t('ui.select_plan'),
        choices: [
          {
            name: '[Lite Plan] ' + locale.t('ui.plan_lite') +
              (litePlanConfig?.api_key ? chalk.green(' ✓') : ''),
            value: 'ssy_cp_lite' as const
          },
          {
            name: '[Pro Plan] ' + locale.t('ui.plan_pro') +
              (proPlanConfig?.api_key ? chalk.green(' ✓') : ''),
            value: 'ssy_cp_pro' as const
          },
          {
            name: '[Enterprise Plan] ' + locale.t('ui.plan_enterprise') +
              (enterprisePlanConfig?.api_key ? chalk.green(' ✓') : ''),
            value: 'ssy_cp_enterprise' as const
          },
          {
            name: '[Pay as You Go] ' + locale.t('ui.plan_go') +
              (goPlanConfig?.api_key ? chalk.green(' ✓') : ''),
            value: 'pay_as_you_go' as const
          },
          { name: locale.t('ui.select_both_plans'), value: 'both' as const },
          { name: locale.t('ui.skip_config'), value: 'skip' as const },
          { name: '<-  ' + locale.t('ui.nav_return'), value: 'back' as const },
          { name: 'x   ' + locale.t('ui.nav_exit'), value: 'exit' as const }
        ],
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
    if (!plan) return;

    while (true) {
      this.resetScreen();
      this.printSectionHeader(locale.t('ui.config_api_key') + ` - ${plan.name_zh}`);

      const currentConfig = settings.getPlanConfig(planId);
      if (currentConfig?.api_key) {
        console.log(chalk.gray('  ' + locale.t('ui.config_api_key') + ' ') +
          chalk.gray(locale.t('ui.api_key_set') + ' (' + currentConfig.api_key.slice(0, 6) + '…)'));
        console.log('');
      }

      const apiKeyUrl = API_KEY_URLS[planId as keyof typeof API_KEY_URLS];
      const clickableUrl = terminalLink(apiKeyUrl, apiKeyUrl, { fallback: () => apiKeyUrl });
      console.log(chalk.blue('💡 ' + locale.t('ui.api_key_get_hint', { url: clickableUrl })));
      console.log('');

      const choices: { name: string; value: 'model' | 'input' | 'back' | 'exit' }[] = [];
      if (currentConfig?.api_key) {
        choices.push({ name: '>   ' + locale.t('ui.switch_model'), value: 'model' });
      }
      choices.push(
        { name: '>   ' + (currentConfig?.api_key ? locale.t('ui.update_api_key') : locale.t('ui.input_api_key')), value: 'input' },
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
      } else if (action === 'input') {
        this.resetScreen();
        this.printSectionHeader(locale.t('ui.config_api_key') + ` - ${plan.name_zh}`);
        console.log(chalk.blue('💡 ' + locale.t('ui.api_key_get_hint', { url: clickableUrl })));
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

        await this.selectModel(planId);
        return;
      }
    }
  }

  private async selectModel(planId: string, requiredApi?: string[]): Promise<void> {
    const plan = PLANS[planId];
    const models = await plan.getModels() || plan.models
    if (!plan) return;

    const availableModels = requiredApi? filterSupportedModels(models, requiredApi): models;
    if (availableModels.length === 0) {
      console.log(chalk.red(`\n[!] No models support required API: ${requiredApi}`));
      return;
    }

    this.resetScreen();
    this.printSectionHeader(locale.t('ui.select_model') + ` - ${plan.name_zh}`);

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

          if (toolName === 'openclaw') {
            const gwInstallSpinner = ora({
              text: `Installing ${tool.displayName} gateway...`,
              spinner: 'dots',
            }).start();
            try {
              execSync('openclaw gateway install', { stdio: 'pipe' });
              gwInstallSpinner.succeed(chalk.green(`${tool.displayName} gateway installed`));
            } catch (gwError) {
              gwInstallSpinner.fail(chalk.red(`${tool.displayName} gateway install failed`));
              logger.logError('SetupFlow.openclawGatewayInstall', gwError);
            }

            const gwStartSpinner = ora({
              text: `Starting ${tool.displayName} gateway...`,
              spinner: 'dots',
            }).start();
            try {
              execSync('openclaw gateway start', { stdio: 'pipe' });
              gwStartSpinner.succeed(chalk.green(`${tool.displayName} gateway started`));
            } catch (gwError) {
              gwStartSpinner.fail(chalk.red(`${tool.displayName} gateway start failed`));
              logger.logError('SetupFlow.openclawGatewayStart', gwError);
            }
          }
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

  async showMainMenu(): Promise<void> {
    const cfg = settings.getConfig();
    locale.loadFromConfig(cfg.lang);

    while (true) {
      this.resetScreen();
      const currentCfg = settings.getConfig();

      // Supported tools display
      console.log(chalk.gray('  ' + locale.t('ui.main_menu_title')));
      console.log(
        chalk.cyan('    ◆ ') + chalk.white('OpenClaw'.padEnd(20, ' ')) +
        chalk.gray('— AI coding gateway')
      );
      console.log(
        chalk.cyan('    ◆ ') + chalk.white('Claude Code'.padEnd(20, ' ')) +
        chalk.gray('— AI coding assistant')
      );
      console.log(
        chalk.cyan('    ◆ ') + chalk.white('OpenCode'.padEnd(20, ' ')) +
        chalk.gray('— Open-source coding tool')
      );
      // console.log(
      //   chalk.cyan('    ◆ ') + chalk.white('Nanobot') +
      //   chalk.gray('— AI agent framework')
      // );
      // console.log(
      //   chalk.cyan('    ◆ ') + chalk.white('ZeroClaw') +
      //   chalk.gray('— AI gateway')
      // );
      console.log(
        chalk.cyan('    ◆ ') + chalk.white('PicoClaw'.padEnd(20, ' ')) +
        chalk.gray('— AI coding tool')
      );
      console.log(
        chalk.cyan('    ◆ ') + chalk.white('Codex'.padEnd(20, ' ')) +
        chalk.gray('— AI coding tool')
      );
      console.log(
        chalk.cyan('    ◆ ') + chalk.white('Aider'.padEnd(20, ' ')) +
        chalk.gray('— AI coding tool')
      );
      console.log();

      // Promo banner
      // const promoLinkDisplay = locale.t('ui.promo_link_display');
      // const promoLinkUrl = locale.t('ui.promo_link_url');
      // const codingPlanLink = terminalLink(promoLinkDisplay, promoLinkUrl, { fallback: () => promoLinkDisplay });
      // const promoBox = chalk.bgHex('#ff6a00').black.bold(
      //   ` 🔥 ${locale.t('ui.promo_buy')} Coding Plan → ${codingPlanLink} `
      // );
      // console.log(`  ${promoBox}`);
      // console.log();

      // Status display
      console.log(
        chalk.gray('  精简计划: ') +
        (currentCfg.plans?.['ssy_cp_lite']?.api_key
          ? chalk.green('✓ (' + currentCfg.plans['ssy_cp_lite'].api_key.slice(0, 6) + '…)')
          : chalk.red('✗')) +
        chalk.gray('  专业计划: ') +
        (currentCfg.plans?.['ssy_cp_pro']?.api_key
          ? chalk.green('✓ (' + currentCfg.plans['ssy_cp_pro'].api_key.slice(0, 6) + '…)')
          : chalk.red('✗')) + 

        chalk.gray('  企业计划: ') +
        (currentCfg.plans?.['ssy_cp_enterprise']?.api_key
          ? chalk.green('✓ (' + currentCfg.plans['ssy_cp_enterprise'].api_key.slice(0, 6) + '…)')
          : chalk.red('✗')) +
        chalk.gray('  按量付费: ') +
        (currentCfg.plans?.['pay_as_you_go']?.api_key
          ? chalk.green('✓ (' + currentCfg.plans['pay_as_you_go'].api_key.slice(0, 6) + '…)')
          : chalk.red('✗'))
      );
      console.log();

      const action = await select({
        message: locale.t('ui.select_operation'),
        choices: [
          { name: locale.t('ui.menu_select_plan'), value: 'plan' as const, description: locale.t('ui.select_plan') },
          { name: locale.t('ui.menu_config_tool'), value: 'tool' as const, description: locale.t('ui.select_tool') },
          { name: locale.t('ui.menu_config_language'), value: 'lang' as const, description: locale.t('ui.select_language') },
          { name: locale.t('ui.menu_exit'), value: 'exit' as const },
        ],
        theme,
      });

      if (action === 'exit') {
        this.quit();
      } else if (action === 'lang') {
        await this.configLanguage();
      } else if (action === 'plan') {
        await this.configPlan();
      } else if (action === 'tool') {
        await this.selectAndConfigureTool();
      }
    }
  }

  async showToolMenu(toolName: string): Promise<void> {
    const tool = SUPPORTED_TOOLS[toolName];
    if (!tool) return;

    // ZeroClaw needs `zeroclaw onboard` before configuration
    while (toolName === 'zeroclaw' && !zeroClawManager.isOnboarded()) {
      this.resetScreen();
      this.printSectionHeader(`${tool.displayName} 初始化`);
      console.log(chalk.yellow('⚠  ZeroClaw 尚未初始化，配置前需要先完成 onboard。'));
      console.log('');

      const action = await select({
        message: locale.t('ui.select_action'),
        choices: [
          { name: '>   🚀 运行 zeroclaw onboard（初始化）', value: 'onboard' as const },
          { name: '<-  ' + locale.t('ui.nav_return'), value: 'back' as const },
          { name: 'x   ' + locale.t('ui.nav_exit'), value: 'exit' as const },
        ],
        theme,
      });

      if (action === 'exit') {
        this.quit();
      } else if (action === 'back') {
        return;
      } else if (action === 'onboard') {
        console.log(chalk.cyan('\n运行 zeroclaw onboard...\n'));
        spawnSync('zeroclaw', ['onboard'], { stdio: 'inherit', shell: true });
      }
    }

    while (true) {
      this.resetScreen();
      this.printSectionHeader(`${tool.displayName} ${locale.t('ui.main_menu_title')}`);

      const litePlanConfig = settings.getPlanConfig('ssy_cp_lite');
      const proPlanConfig = settings.getPlanConfig('ssy_cp_pro');
      const enterprisePlanConfig = settings.getPlanConfig('ssy_cp_enterprise');
      const goPlanConfig = settings.getPlanConfig('pay_as_you_go');

      const detectedConfig = this.detectToolConfig(toolName);

      console.log(chalk.cyan.bold('📋 ' + locale.t('ui.current_config_status') + ':'));
      console.log(chalk.gray('  Lite Plan: ') +
        (litePlanConfig?.api_key
          ? chalk.green('✓ ' + (litePlanConfig.model || 'anthropic/claude-sonnet-4.6'))
          : chalk.red(locale.t('ui.not_set'))));
      console.log(chalk.gray('  Pro Plan: ') +
        (proPlanConfig?.api_key
          ? chalk.green('✓ ' + (proPlanConfig.model || 'anthropic/claude-sonnet-4.6'))
          : chalk.red(locale.t('ui.not_set'))));

      console.log(chalk.gray('  Enterprise Plan: ') +
        (enterprisePlanConfig?.api_key
          ? chalk.green('✓ ' + (enterprisePlanConfig.model || 'anthropic/claude-sonnet-4.6'))
          : chalk.red(locale.t('ui.not_set'))));
      console.log(chalk.gray('  Pay as You Go: ') +
        (goPlanConfig?.api_key
          ? chalk.green('✓ ' + (goPlanConfig.model || 'anthropic/claude-sonnet-4.6'))
          : chalk.red(locale.t('ui.not_set'))));
      console.log('');

      console.log(chalk.yellow.bold(`📋 ${tool.displayName} ` + locale.t('ui.current_config_status') + ':'));
      if (detectedConfig.plan) {
        let planName = locale.t('ui.plan_lite')
        if(detectedConfig.plan === 'ssy_cp_pro'){
          planName = locale.t('ui.plan_pro')
        }
        if(detectedConfig.plan === 'ssy_cp_enterprise'){
          planName = locale.t('ui.plan_enterprise')
        }
        if(detectedConfig.plan === 'pay_as_you_go'){
          planName = locale.t('ui.plan_go')
        }
        console.log(chalk.gray('  ' + locale.t('ui.config_plan') + ': ') + chalk.green(planName));
        if (detectedConfig.apiKey) {
          console.log(chalk.gray('  API Key: ') + chalk.gray(locale.t('ui.api_key_set') + ' (' + detectedConfig.apiKey.slice(0, 6) + '…)'));
        }
      } else {
        console.log(chalk.gray('  ' + locale.t('ui.config_plan') + ': ') + chalk.red(locale.t('ui.not_set')));
      }
      console.log('');

      const choices: Array<{ name: string; value: string }> = [];

      if (litePlanConfig?.api_key) {
        const isActive = detectedConfig.plan === 'ssy_cp_lite';
        choices.push({
          name: `${isActive ? '🔄' : '📥'} 设置 Lite Plan 配置到 ${tool.displayName}`,
          value: 'load_lite-plan'
        });
      }

      if (proPlanConfig?.api_key) {
        const isActive = detectedConfig.plan === 'ssy_cp_pro';
        choices.push({
          name: `${isActive ? '🔄' : '📥'} 设置 Pro Plan 配置到 ${tool.displayName}`,
          value: 'load_pro-plan'
        });
      }

      if (enterprisePlanConfig?.api_key) {
        const isActive = detectedConfig.plan === 'ssy_cp_enterprise';
        choices.push({
          name: `${isActive ? '🔄' : '📥'} 设置 Enterprise Plan 配置到 ${tool.displayName}`,
          value: 'load_enterprise-plan'
        });
      }

      if (goPlanConfig?.api_key) {
        const isActive = detectedConfig.plan === 'pay_as_you_go';
        choices.push({
          name: `${isActive ? '🔄' : '📥'} 设置 按量付费 配置到 ${tool.displayName}`,
          value: 'pay_as_you_go'
        });
      }

      if (detectedConfig.plan) {
        choices.push({ name: `🗑️  卸载 ${tool.displayName} 配置`, value: 'unload' });

        if (toolName === 'opencode' || toolName === 'claude-code') {
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

      if (action === 'exit') {
        this.quit();
      } else if (action === 'back') {
        return;
      } else if (action === 'load_lite-plan') {
        await this.loadPlanConfig(toolName, 'ssy_cp_lite');
      } else if (action === 'load_pro-plan') {
        await this.loadPlanConfig(toolName, 'ssy_cp_pro');
      } else if (action === 'load_enterprise-plan') {
        await this.loadPlanConfig(toolName, 'ssy_cp_enterprise');
      } else if (action === 'pay_as_you_go') {
        await this.loadPlanConfig(toolName, 'pay_as_you_go');
      } else if (action === 'unload') {
        await this.unloadPlanConfig(toolName);
      } else if (action === 'start') {
        await this.startTool(toolName);
      }
    }
  }

  private detectToolConfig(toolName: string): { plan: string | null; apiKey: string | null } {
    if (toolName === 'opencode') {
      return openCodeIntegration.detectCurrentConfig();
    }
    if (toolName === 'claude-code') {
      return claudeIntegration.detectCurrentConfig();
    }
    if (toolName === 'nanobot') {
      return nanobotManager.detectCurrentConfig();
    }
    if (toolName === 'zeroclaw') {
      return zeroClawManager.detectCurrentConfig();
    }
    if (toolName === 'openclaw') {
      return openClawManager.detectCurrentConfig();
    }
    if (toolName === 'picoclaw') {
      return picoclawManager.detectCurrentConfig();
    }
    if (toolName === 'aider') {
      return aiderManager.detectCurrentConfig();
    }
    if (toolName === 'codex') {
      return codexManager.detectCurrentConfig();
    }
    return { plan: null, apiKey: null };
  }

  private async loadPlanConfig(toolName: string, planId: string): Promise<void> {
    const plan = PLANS[planId];
    const tool = SUPPORTED_TOOLS[toolName];
    if (!plan || !tool) return;
    plan["models"] = await plan.getModels() || plan.models;

    const config = settings.getPlanConfig(planId);
    if (!config?.api_key) {
      console.log(chalk.red('\n[!] ' + locale.t('ui.missing_config')));
      await new Promise(resolve => setTimeout(resolve, 3000));
      return;
    }

    const spinner = ora({
      text: locale.t('ui.loading_config'),
      spinner: 'dots'
    }).start();

    try {
      await registry.loadPlanConfig(toolName, plan, config.api_key, config.model);
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

    if (toolName === 'nanobot' || toolName === 'zeroclaw') {
      const subcommandChoices: Array<{ name: string; value: string }> = [];

      if (toolName === 'nanobot') {
        subcommandChoices.push(
          { name: '>   启动交互代理 (agent)', value: 'agent' },
          { name: '>   启动网关 (gateway)', value: 'gateway' },
          { name: '>   首次初始化 (onboard)', value: 'onboard' },
          { name: '>   查看状态 (status)', value: 'status' }
        );
      } else if (toolName === 'zeroclaw') {
        subcommandChoices.push(
          { name: '>   启动交互代理 (agent)', value: 'agent' },
          { name: '>   启动守护进程 (daemon)', value: 'daemon' },
          { name: '>   启动网关 (gateway)', value: 'gateway' },
          { name: '>   首次初始化 (onboard)', value: 'onboard' },
          { name: '>   查看状态 (status)', value: 'status' }
        );
      }

      subcommandChoices.push(
        { name: '<-  返回', value: 'back' },
        { name: 'x   退出', value: 'exit' }
      );

      const subcommand = await select({
        message: locale.t('ui.select_action'),
        choices: subcommandChoices,
        theme,
      });

      if (subcommand === 'exit') {
        this.quit();
      } else if (subcommand === 'back') {
        return;
      } else if (subcommand) {
        fullCommand = `${tool.command} ${subcommand}`;
      }
    }

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
