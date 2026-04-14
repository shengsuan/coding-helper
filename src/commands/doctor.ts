import chalk from 'chalk';
import { execSync } from 'child_process';
import { settings as configManager } from '../lib/settings.js';
import { locale as i18n } from '../lib/locale.js';
import { registry as toolManager } from '../lib/registry.js';
import { openCodeIntegration as openCodeManager } from '../lib/opencode-integration.js';
import { nanobotManager } from '../lib/nanobot-manager.js';
import { zeroClawManager } from '../lib/zeroclaw-manager.js';
import { claudeIntegration } from '../lib/claude-integration.js';
import { openClawManager } from '../lib/openclaw-manager.js';
import { SUPPORTED_TOOLS } from '../lib/constants.js';
import { picoclawManager } from '../lib/picoclaw-manager.js';
import { codexManager } from '../lib/codex-manager.js';
import { aiderManager } from '../lib/aider-manager.js';

export async function doctorCommand(): Promise<void> {
  console.log(chalk.bold.cyan('\n🔍 ' + i18n.t('doctor.checking') + '\n'));

  const issues: string[] = [];

  console.log(chalk.gray('─'.repeat(50)));

  console.log(chalk.bold('\n📦 ' + i18n.t('doctor.node_version') + ':'));
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion >= 18) {
    console.log(chalk.green(`  ✓ Node.js ${nodeVersion}`));
  } else {
    console.log(chalk.red(`  ✗ Node.js ${nodeVersion} (需要 >= 18)`));
    issues.push('Node.js 版本过低，请升级到 18 或更高版本');
  }

  console.log(chalk.bold('\n🐍 Python:'));
  const pyEnv = toolManager.detectPythonEnv('3.11');
  if (pyEnv.pythonCmd && pyEnv.version) {
    if (pyEnv.meetsMinVersion) {
      console.log(chalk.green(`  ✓ Python ${pyEnv.version}`));
    } else {
      console.log(chalk.red(`  ✗ Python ${pyEnv.version} (需要 >= 3.11)`));
      issues.push('Python 版本过低，Nanobot 需要 >= 3.11');
    }
  } else {
    console.log(chalk.yellow(`  ○ Python: 未找到 (Nanobot 需要 Python >= 3.11)`));
  }
  if (pyEnv.pipCmd) {
    console.log(chalk.green(`  ✓ pip (${pyEnv.pipCmd})`));
  } else {
    console.log(chalk.yellow(`  ○ pip: 未找到`));
  }

  console.log(chalk.bold('\n🔧 ' + i18n.t('doctor.tool_installed') + ':'));
  for (const [name, tool] of Object.entries(SUPPORTED_TOOLS)) {
    const installed = toolManager.isToolInstalled(name);
    if (installed) {
      try {
        const version = execSync(`${tool.command} --version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        console.log(chalk.green(`  ✓ ${tool.displayName}: ${version.split('\n')[0]}`));
      } catch {
        console.log(chalk.green(`  ✓ ${tool.displayName}: 已安装`));
      }
    } else {
      console.log(chalk.yellow(`  ○ ${tool.displayName}: 未安装`));
    }
  }

  console.log(chalk.bold('\n⚙️  ' + i18n.t('doctor.config_status') + ':'));

  const volcenginePlanConfig = configManager.getPlanConfig('ssy_cp_lite');
  const byteplusPlanConfig = configManager.getPlanConfig('ssy_cp_pro');

  if (volcenginePlanConfig?.api_key) {
    console.log(chalk.green(`  ✓ Lite Plan API Key: ${volcenginePlanConfig.api_key.slice(0, 6)}…`));
  } else {
    console.log(chalk.gray('  ○ Lite Plan API Key: 未配置'));
  }

  if (byteplusPlanConfig?.api_key) {
    console.log(chalk.green(`  ✓ Pro Plan API Key: ${byteplusPlanConfig.api_key.slice(0, 6)}…`));
  } else {
    console.log(chalk.gray('  ○ Pro Plan API Key: 未配置'));
  }

  console.log(chalk.bold('\n🤖 Claude Code 配置:'));
  const claudeDetected = claudeIntegration.detectCurrentConfig();
  if (claudeDetected.plan) {
    const ccPlanName = getPlanDisplayName(claudeDetected.plan);
    console.log(chalk.green(`  ✓ 当前套餐: ${ccPlanName}`));
    if (claudeDetected.apiKey) {
      console.log(chalk.green(`  ✓ API Key: ${claudeDetected.apiKey.slice(0, 6)}…`));
    }
  } else {
    console.log(chalk.gray('  ○ 未配置任何套餐'));
  }

  console.log(chalk.bold('\n📋 OpenCode 配置:'));
  const detectedConfig = openCodeManager.detectCurrentConfig();
  if (detectedConfig.plan) {
    const planName = getPlanDisplayName(detectedConfig.plan);
    console.log(chalk.green(`  ✓ 当前套餐: ${planName}`));
    if (detectedConfig.apiKey) {
      console.log(chalk.green(`  ✓ API Key: ${detectedConfig.apiKey.slice(0, 6)}…`));
    }
  } else {
    console.log(chalk.gray('  ○ 未配置任何套餐'));
  }

  console.log(chalk.bold('\n🦞 OpenClaw 配置:'));
  const openclawDetected = openClawManager.detectCurrentConfig();
  if (openclawDetected.plan) {
    const ocPlanName = getPlanDisplayName(openclawDetected.plan);
    console.log(chalk.green(`  ✓ 当前套餐: ${ocPlanName}`));
    if (openclawDetected.apiKey) {
      console.log(chalk.green(`  ✓ API Key: ${openclawDetected.apiKey.slice(0, 6)}…`));
    }
  } else {
    console.log(chalk.gray('  ○ 未配置任何套餐'));
  }

  console.log(chalk.bold('\n🤖 Nanobot 配置:'));
  const nanobotDetected = nanobotManager.detectCurrentConfig();
  if (nanobotDetected.plan) {
    const nbPlanName = getPlanDisplayName(nanobotDetected.plan);
    console.log(chalk.green(`  ✓ 当前套餐: ${nbPlanName}`));
    if (nanobotDetected.apiKey) {
      console.log(chalk.green(`  ✓ API Key: ${nanobotDetected.apiKey.slice(0, 6)}…`));
    }
  } else {
    console.log(chalk.gray('  ○ 未配置任何套餐'));
  }

  console.log(chalk.bold('\n🧬 ZeroClaw 配置:'));
  const zeroclawDetected = zeroClawManager.detectCurrentConfig();
  if (zeroclawDetected.plan) {
    const zcPlanName = getPlanDisplayName(zeroclawDetected.plan);
    console.log(chalk.green(`  ✓ 当前套餐: ${zcPlanName}`));
    if (zeroclawDetected.apiKey) {
      console.log(chalk.green(`  ✓ API Key: ${zeroclawDetected.apiKey.slice(0, 6)}…`));
    }
  } else {
    console.log(chalk.gray('  ○ 未配置任何套餐'));
  }

  console.log(chalk.bold('\n🤖 Picoclaw 配置:'));
  const picoclawDetected = picoclawManager.detectCurrentConfig();
  if (picoclawDetected.plan) {
    const pcPlanName = getPlanDisplayName(picoclawDetected.plan);
    console.log(chalk.green(`  ✓ 当前套餐: ${pcPlanName}`));
    if (picoclawDetected.apiKey) {
      console.log(chalk.green(`  ✓ API Key: ${picoclawDetected.apiKey.slice(0, 6)}…`));
    }
  } else {
    console.log(chalk.gray('  ○ 未配置任何套餐'));
  }

  console.log(chalk.bold('\n🤖 Codex 配置:'));
  const codexDetected = codexManager.detectCurrentConfig();
  if (codexDetected.plan) {
    const cdPlanName = getPlanDisplayName(codexDetected.plan);
    console.log(chalk.green(`  ✓ 当前套餐: ${cdPlanName}`));
    if (codexDetected.apiKey) {
      console.log(chalk.green(`  ✓ API Key: ${codexDetected.apiKey.slice(0, 6)}…`));
    }
  } else {
    console.log(chalk.gray('  ○ 未配置任何套餐'));
  }

  console.log('');
  console.log(chalk.gray('─'.repeat(50)));

  if (issues.length === 0) {
    console.log(chalk.green.bold('\n✅ ' + i18n.t('doctor.all_good') + '\n'));
  } else {
    console.log(chalk.red.bold('\n❌ ' + i18n.t('doctor.issues_found') + '\n'));
    issues.forEach(issue => console.log(chalk.red('  • ' + issue)));
    console.log('');
  }
}

function getPlanDisplayName(planId: string): string {
  switch (planId) {
    case 'ssy_cp_lite':
      return 'Lite Plan';
    case 'ssy_cp_pro':
      return 'Pro Plan';
    case 'ssy_cp_enterprise':
      return 'Enterprise Plan';
    case 'pay_as_you_go':
      return '按使用量计费';
    default:
      return planId;
  }
}