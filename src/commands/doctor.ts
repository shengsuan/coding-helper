import chalk from 'chalk';
import { execSync } from 'child_process';
import { settings as configManager } from '../lib/settings.js';
import { locale as i18n } from '../lib/locale.js';
import { registry as toolManager } from '../lib/registry.js';
import { toolManagers } from '../manager/index.js';
import { SUPPORTED_TOOLS } from '../lib/constants.js';

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

  const plans = configManager.getAllPlans();
  for(const plan of plans) {
    if (plan.api_key) {
      console.log(chalk.green(`  ✓ ${plan.label} API Key: ${plan.api_key.slice(0, 6)}…`));
    } else {
      console.log(chalk.gray(`  ○ ${plan.label} API Key: 未配置`));
    }
  }

  for (const name of Object.keys(SUPPORTED_TOOLS)) {
    const displayName = SUPPORTED_TOOLS[name]?.displayName || name;
    const manager = toolManagers[name];
    if (!manager) continue;
    console.log(chalk.bold(`\n🤖 ${displayName} 配置:`));
    const detected = manager.detectCurrentConfig();
    if (detected.plan) {
      console.log(chalk.green(`  ✓ 当前套餐: ${configManager.getPlanConfig(detected.plan)?.label || detected.plan}`));
      if (detected.apiKey) {
        console.log(chalk.green(`  ✓ API Key: ${detected.apiKey.slice(0, 6)}…`));
      }
    } else {
      console.log(chalk.gray('  ○ 未配置任何套餐'));
    }
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