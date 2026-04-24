import chalk from 'chalk';
import ora from 'ora';
import { settings } from '../lib/settings.js';
import { registry } from '../lib/registry.js';
import { PLANS, SUPPORTED_TOOLS } from '../lib/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Set command: Quickly configure tool with a plan
 * Usage: coding-helper set <tool_name> <plan_name>
 * Example: coding-helper set codex ssy_cp_enterprise
 */
export async function setCommand(args: string[]): Promise<void> {
  const [toolName, planName] = args;

  // Validate arguments
  if (!toolName || !planName) {
    console.log(chalk.red('❌ 参数不足'));
    console.log(chalk.gray('\n用法: coding-helper set <tool_name> <plan_name>'));
    console.log(chalk.gray('\n可用工具:'));
    Object.keys(SUPPORTED_TOOLS).forEach(tool => {
      console.log(chalk.gray(`  - ${tool}`));
    });
    console.log(chalk.gray('\n可用套餐:'));
    console.log(chalk.gray('  - ssy_cp_lite'));
    console.log(chalk.gray('  - ssy_cp_pro'));
    console.log(chalk.gray('  - ssy_cp_enterprise'));
    console.log(chalk.gray('  - pay_as_you_go'));
    console.log(chalk.gray('\n示例: coding-helper set codex ssy_cp_enterprise'));
    return;
  }

  // Validate tool name
  if (!SUPPORTED_TOOLS[toolName]) {
    console.log(chalk.red(`❌ 未知的工具: ${toolName}`));
    console.log(chalk.gray('\n可用工具:'));
    Object.keys(SUPPORTED_TOOLS).forEach(tool => {
      console.log(chalk.gray(`  - ${tool}`));
    });
    return;
  }

  // Validate plan name
  if (!PLANS[planName]) {
    console.log(chalk.red(`❌ 未知的套餐: ${planName}`));
    console.log(chalk.gray('\n可用套餐:'));
    console.log(chalk.gray('  - ssy_cp_lite'));
    console.log(chalk.gray('  - ssy_cp_pro'));
    console.log(chalk.gray('  - ssy_cp_enterprise'));
    console.log(chalk.gray('  - pay_as_you_go'));
    return;
  }

  const tool = SUPPORTED_TOOLS[toolName];
  const plan = PLANS[planName];

  try {
    // Check if tool is installed
    const spinner = ora(`检查 ${tool.displayName} 是否已安装...`).start();

    if (!registry.isToolInstalled(toolName)) {
      spinner.info(`${tool.displayName} 未安装`);
      console.log(chalk.yellow(`\n📦 ${tool.displayName} 尚未安装，开始安装...`));

      try {
        await registry.installTool(toolName);
      } catch (error) {
        logger.logError('setCommand.installTool', error);
        console.log(chalk.red(`\n❌ ${tool.displayName} 安装失败`));
        return;
      }
    } else {
      spinner.succeed(`${tool.displayName} 已安装`);
    }

    // Check if API key is configured
    const apiKey = settings.getApiKey(planName);

    if (!apiKey) {
      spinner.fail(`套餐 ${plan.name} 的 API Key 未配置`);
      console.log(chalk.red(`\n❌ 请先配置 ${plan.name} 的 API Key`));
      console.log(chalk.gray(`\n使用以下命令配置 API Key:`));
      console.log(chalk.white(`  coding-helper auth ${planName} <your-api-key>`));
      return;
    }

    // Load plan configuration to the tool
    spinner.start(`正在配置 ${tool.displayName} 使用 ${plan.name}...`);

    try {
      // Get configured model from settings
      const configuredModel = settings.getModel(planName);
      await registry.loadPlanConfig(toolName, plan, apiKey, configuredModel);
      spinner.succeed(`${tool.displayName} 已配置为使用 ${plan.name}`);

      console.log(chalk.green(`\n✅ 配置成功!`));
      console.log(chalk.gray(`\n工具: ${tool.displayName}`));
      console.log(chalk.gray(`套餐: ${plan.name_zh} (${plan.name})`));
      console.log(chalk.gray(`API 端点: ${plan.baseUrl}`));

      // Show configured model if available
      if (configuredModel) {
        console.log(chalk.gray(`模型: ${configuredModel}`));
      }

      console.log(chalk.cyan(`\n🚀 现在可以使用 ${tool.command} 命令了!`));

    } catch (error) {
      spinner.fail(`配置失败`);
      logger.logError('setCommand.loadPlanConfig', error);
      console.log(chalk.red(`\n❌ 配置失败: ${error instanceof Error ? error.message : String(error)}`));
      return;
    }

  } catch (error) {
    logger.logError('setCommand', error);
    console.log(chalk.red(`\n❌ 发生错误: ${error instanceof Error ? error.message : String(error)}`));
  }
}
