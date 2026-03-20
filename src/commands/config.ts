import chalk from 'chalk';
import { settings as configManager } from '../lib/settings.js';
import { locale as i18n } from '../lib/locale.js';
import { registry as toolManager } from '../lib/registry.js';
import { openCodeIntegration as openCodeManager } from '../lib/opencode-integration.js';
import { PLANS, SUPPORTED_TOOLS } from '../lib/constants.js';
import { setupFlow as wizard } from '../lib/setup-flow.js';

export async function configCommand(args: string[]): Promise<void> {
  const [option] = args;

  if (!option) {
    await wizard.showMainMenu();
    return;
  }

  switch (option) {
    case 'lang':
    case 'language':
      await wizard['configLanguage']();
      break;
    case 'plan':
      await wizard['configPlan']();
      break;
    case 'apikey':
    case 'api-key':
      const { planId } = await import('inquirer').then(inquirer => 
        inquirer.default.prompt([
          {
            type: 'list',
            name: 'planId',
            message: '选择要配置的套餐:',
            choices: [
              { name: 'Lite Plan (国内)', value: 'cp_test_lite' },
              { name: 'Pro Plan (海外)', value: 'cp_test_pro' }
            ]
          }
        ])
      );
      await wizard['configApiKey'](planId);
      break;
    case 'opencode':
      await wizard['showToolMenu']('opencode');
      break;
    case 'nanobot':
      await wizard['showToolMenu']('nanobot');
      break;
    case 'zeroclaw':
      await wizard['showToolMenu']('zeroclaw');
      break;
    case 'claude-code':
      await wizard['showToolMenu']('claude-code');
      break;
    case 'openclaw':
      await wizard['showToolMenu']('openclaw');
      break;
    default:
      console.log(chalk.red(`未知选项: ${option}`));
      console.log(chalk.gray('可用选项: lang, plan, apikey, opencode, claude-code, openclaw, nanobot, zeroclaw'));
  }
}
