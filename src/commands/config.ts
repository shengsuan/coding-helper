import chalk from 'chalk';
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
              { name: 'Lite Plan', value: 'ssy_cp_lite' },
              { name: 'Pro Plan', value: 'ssy_cp_pro' },
              { name: 'Enterprise Plan', value: 'ssy_cp_enterprise' },
              { name: 'Pay as You Go', value: 'pay_as_you_go' },
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
    case 'hermes':
      await wizard['showToolMenu']('hermes');
      break;
    case 'claude-code':
      await wizard['showToolMenu']('claude-code');
      break;
    case 'openclaw':
      await wizard['showToolMenu']('openclaw');
      break;
    case 'picoclaw':
      await wizard['showToolMenu']('picoclaw');
      break;
    case 'codex':
      await wizard['showToolMenu']('codex');
      break;
    default:
      console.log(chalk.red(`未知选项: ${option}`));
      console.log(chalk.gray('可用选项: lang, plan, apikey, opencode, claude-code, openclaw, nanobot, picoclaw, codex, hermes'));
  }
}
