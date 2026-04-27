import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { settings } from '../lib/settings.js';
import { registry } from '../lib/registry.js';
import { SUPPORTED_TOOLS } from '../lib/constants.js';
import { generateRandomLabel } from '../utils/name-generator.js';
import { generatePlanId } from '../utils/crypto-helper.js';
import { logger } from '../utils/logger.js';

interface CustomConfigOptions {
  url?: string;
  k?: string;        // api_key
  m?: string;        // model
  label?: string;
  t?: string;        // tool
}

const theme = {
  prefix: chalk.cyan('◆'),
  style: { highlight: (text: string) => chalk.cyan(text) },
};

export async function customConfigCommand(options: CustomConfigOptions): Promise<void> {
  try {
    const baseUrl = options.url || await selectOrInputBaseUrl();
    const apiKey = options.k || await selectOrInputApiKey();
    const model = options.m || await selectOrInputModel();
    const toolName = options.t; // -t 为可选参数，不提供时不配置工具
    const planId = generatePlanId(baseUrl, apiKey);
    const existingPlan = settings.getPlanConfig(planId);

    if (existingPlan) {
      console.log(chalk.yellow(`\n该配置已存在：${existingPlan.label || planId}`));
      const shouldUpdate = await confirm({
        message: '是否更新配置？',
        default: true,
        theme,
      });
      if (!shouldUpdate) {
        return;
      }
    }
    const spinner = ora('保存配置...').start();
    settings.addCustomPlan(planId, {
      base_url: baseUrl,
      api_key: apiKey,
      model: model,
      label: options.label || generateRandomLabel(),
      is_custom: true,
      created_at: new Date().toISOString()
    });
    spinner.succeed('配置已保存');
    if (!options.label) {
      const customLabel = await input({
        message: '设置自定义标签（按回车跳过）：',
        default: '',
        theme,
      });
      if (customLabel.trim()) {
        settings.updatePlanLabel(planId, customLabel.trim());
      }
    }
    if (!toolName) {
      console.log(chalk.green(`\n✅ 配置已保存！`));
      console.log(chalk.gray(`\n端点: ${baseUrl}`));
      console.log(chalk.gray(`模型: ${model}`));
      console.log(chalk.gray(`标签: ${settings.getPlanConfig(planId)?.label || planId}`));
      console.log(chalk.cyan(`\n💡 使用 'coding-helper set <tool> ${planId}' 来应用此配置到工具`));
      return;
    }

    const tool = SUPPORTED_TOOLS[toolName];
    if (!tool) {
      console.log(chalk.red(`未知工具：${toolName}`));
      return;
    }

    if (!registry.isToolInstalled(toolName)) {
      const shouldInstall = await confirm({
        message: `${tool.displayName} 未安装，是否安装？`,
        default: true,
        theme,
      });
      if (shouldInstall) {
        await registry.installTool(toolName);
      } else {
        console.log(chalk.yellow('\n⚠️  跳过工具安装，配置已保存但未应用到工具'));
        return;
      }
    }

    spinner.start(`正在配置 ${tool.displayName}...`);
    try {
      const currentPlan = settings.getPlanConfig(planId);
      await registry.loadPlanConfig(toolName, {
        id: planId,
        name: currentPlan?.label || planId,
        name_zh: currentPlan?.label || planId,
        baseUrl: baseUrl,
        anthropicBaseUrl: baseUrl.replace(/\/v1$/, ''),
        apiKeyName: 'Custom API Key'
      }, apiKey, model);
      spinner.succeed(`${tool.displayName} 已配置完成`);
    } catch (error) {
      spinner.fail(`配置 ${tool.displayName} 失败`);
      logger.logError('customConfigCommand.loadPlanConfig', error);
      console.log(chalk.red(`\n❌ 配置失败: ${error instanceof Error ? error.message : String(error)}`));
      return;
    }

    console.log(chalk.green(`\n✅ 配置成功！`));
    console.log(chalk.gray(`\n工具: ${tool.displayName}`));
    console.log(chalk.gray(`端点: ${baseUrl}`));
    console.log(chalk.gray(`模型: ${model}`));
    console.log(chalk.cyan(`\n🚀 现在可以使用 ${tool.command} 命令了！`));

  } catch (error) {
    logger.logError('customConfigCommand', error);
    console.log(chalk.red(`\n❌ 发生错误: ${error instanceof Error ? error.message : String(error)}`));
  }
}

async function selectOrInputBaseUrl(): Promise<string> {
  const customPlans = settings.getCustomPlans();
  if (customPlans.length === 0) {
    return await input({
      message: '输入 API Base URL：',
      validate: (val) => {
        if (!val.trim()) return '必须提供 Base URL';
        try {
          new URL(val);
          return true;
        } catch {
          return '请输入有效的 URL';
        }
      },
      theme,
    });
  }

  const uniqueUrls = [...new Set(customPlans.map(p => p.base_url).filter(Boolean))];

  const choices = [
    ...uniqueUrls.map(url => {
      const plansWithUrl = customPlans.filter(p => p.base_url === url);
      const label = plansWithUrl[0]?.label || 'Unnamed';
      return {
        name: `${label} - ${url}`,
        value: url as string
      };
    }),
    { name: '+ 添加新的 Base URL', value: '__new__' }
  ];

  const selected = await select({
    message: '选择 Base URL：',
    choices,
    theme,
  });

  if (selected === '__new__') {
    return await input({
      message: '输入 API Base URL：',
      validate: (val) => {
        if (!val.trim()) return '必须提供 Base URL';
        try {
          new URL(val);
          return true;
        } catch {
          return '请输入有效的 URL';
        }
      },
      theme,
    });
  }

  return selected;
}

async function selectOrInputApiKey(): Promise<string> {
  const customPlans = settings.getCustomPlans();

  if (customPlans.length === 0) {
    return await input({
      message: '输入 API Key：',
      validate: (val) => val.trim() ? true : '必须提供 API Key',
      theme,
    });
  }

  const choices = [
    ...customPlans
      .filter(plan => plan.api_key)
      .map(plan => ({
        name: `${plan.label || plan.id} - ${plan.api_key!.substring(0, 10)}...`,
        value: plan.api_key!
      })),
    { name: '+ 添加新的 API Key', value: '__new__' }
  ];

  const selected = await select({
    message: '选择 API Key：',
    choices,
    theme,
  });

  if (selected === '__new__') {
    return await input({
      message: '输入 API Key：',
      validate: (val) => val.trim() ? true : '必须提供 API Key',
      theme,
    });
  }

  return selected;
}

async function selectOrInputModel(): Promise<string> {
  return await input({
    message: '输入模型 ID（如 gpt-4, claude-3-opus 等）：',
    validate: (val) => val.trim() ? true : '必须提供模型 ID',
    theme,
  });
}
