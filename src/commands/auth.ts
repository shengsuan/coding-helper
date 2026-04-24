import chalk from "chalk";
import { settings as configManager } from "../lib/settings.js";
import { locale as i18n } from "../lib/locale.js";
import { checkCredential as validateApiKey } from "../lib/auth-checker.js";
import { registry as toolManager } from "../lib/registry.js";
import { openCodeIntegration as openCodeManager } from "../lib/opencode-integration.js";
import { openClawManager } from "../lib/openclaw-manager.js";
import { PLANS, SUPPORTED_TOOLS, API_KEY_URLS } from "../lib/constants.js";
import inquirer from "inquirer";
import ora from "ora";
import { getModels } from "../lib/models.js";

export async function authCommand(args: string[]): Promise<void> {
  const [action, value] = args;

  if (!action || action === "show") {
    showAuthStatus();
    return;
  }

  if (action === "revoke") {
    const planId = value;
    if (!planId || !PLANS[planId]) {
      const { selectedPlan } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedPlan",
          message: "选择要删除 API Key 的套餐:",
          choices: [
            { name: "Lite Plan (国内)", value: "ssy_cp_lite" },
            { name: "Pro Plan (海外)", value: "ssy_cp_pro" },
          ],
        },
      ]);
      configManager.revokeApiKey(selectedPlan);
      console.log(chalk.green("✓ " + i18n.t("auth.revoke_success")));
      return;
    }
    configManager.revokeApiKey(planId);
    console.log(chalk.green("✓ " + i18n.t("auth.revoke_success")));
    return;
  }

  if (action === "reload") {
    let toolName = value || "opencode";
    if (!SUPPORTED_TOOLS[toolName]) {
      const { selectedTool } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedTool",
          message: "选择要加载配置的工具:",
          choices: Object.values(SUPPORTED_TOOLS).map((t) => ({
            name: t.displayName,
            value: t.name,
          })),
        },
      ]);
      toolName = selectedTool;
    }

    const config = configManager.getConfig();
    if (!config.plans?.["ssy_cp_lite"]?.api_key && !config.plans?.["ssy_cp_pro"]?.api_key) {
      console.log(chalk.red("请先配置 API Key"));
      return;
    }

    const { planToLoad } = await inquirer.prompt([
      {
        type: "list",
        name: "planToLoad",
        message: "选择要加载的套餐配置:",
        choices: [
          {
            name: "Lite Plan (国内)",
            value: "ssy_cp_lite",
            disabled: !config.plans?.["ssy_cp_lite"]?.api_key,
          },
          {
            name: "Pro Plan (海外)",
            value: "ssy_cp_pro",
            disabled: !config.plans?.["ssy_cp_pro"]?.api_key,
          },
        ].filter((c) => !c.disabled),
      },
    ]);

    const plan = PLANS[planToLoad];
    const planConfig = configManager.getPlanConfig(planToLoad);

    if (plan && planConfig?.api_key) {
      const displayName = SUPPORTED_TOOLS[toolName]?.displayName || toolName;
      toolManager.loadPlanConfig(
        toolName,
        plan,
        planConfig.api_key,
        planConfig.model,
      );
      console.log(
        chalk.green(`✓ 配置已加载到 ${SUPPORTED_TOOLS[toolName].displayName}`),
      );
    }
    return;
  }

  if (PLANS[action]) {
    const planId = action;
    const apiKey = value;

    if (!apiKey) {
      const plan = PLANS[planId];
      const apiKeyUrl = API_KEY_URLS[planId as keyof typeof API_KEY_URLS];
      console.log(chalk.blue(`\n💡 获取 ${plan.apiKeyName}: ${apiKeyUrl}\n`));

      const { inputKey } = await inquirer.prompt([
        {
          type: "password",
          name: "inputKey",
          mask: "*",
          message: `输入 ${plan.apiKeyName}:`,
        },
      ]);

      if (!inputKey) {
        console.log(chalk.red(i18n.t("auth.missing_api_key")));
        return;
      }

      const spinner = ora(i18n.t("ui.validating_api_key")).start();
      const result = await validateApiKey(inputKey.trim(), planId);

      if (!result.valid) {
        spinner.fail(chalk.red(i18n.t("ui.api_key_invalid")));
        return;
      }

      spinner.succeed(chalk.green(i18n.t("ui.set_success")));
      configManager.setApiKey(planId, inputKey.trim());
      const models = await getModels(planId);
      const { selectModel } = await inquirer.prompt([
        {
          type: "list",
          name: "selectModel",
          message: i18n.t("ui.select_default_model"),
          choices: models.map((m) => ({
            name: `${m.id} (${Math.floor(m.contextLength / 1000)}K)`,
            value: m.id,
          })),
          default: "",
        },
      ]);

      configManager.setModel(planId, selectModel);
      console.log(chalk.green("✓ " + i18n.t("auth.set_success")));
      return;
    }

    const spinner = ora(i18n.t("ui.validating_api_key")).start();
    const result = await validateApiKey(apiKey.trim(), planId);

    if (!result.valid) {
      spinner.fail(chalk.red(i18n.t("ui.api_key_invalid")));
      return;
    }

    spinner.succeed(chalk.green(i18n.t("ui.set_success")));
    configManager.setApiKey(planId, apiKey.trim());
    console.log(chalk.green("✓ " + i18n.t("auth.set_success")));
    return;
  }

  console.log(chalk.red(i18n.t("auth.invalid_plan")));
}

function showAuthStatus(): void {
  console.log(chalk.bold("\n" + i18n.t("auth.show_status") + ":\n"));
  const lite = configManager.getPlanConfig("ssy_cp_lite");
  const pro = configManager.getPlanConfig("ssy_cp_pro");
  const enterprise = configManager.getPlanConfig("ssy_cp_enterprise");
  const payg = configManager.getPlanConfig("pay_as_you_go");

  console.log(chalk.gray("Lite Plan:"));
  if (lite?.api_key) {
    console.log(
      chalk.green(`  ✓ API Key: ${lite.api_key.slice(0, 6)}…`),
    );
    console.log(
      chalk.gray(`  默认模型: ${lite.model || ""}`),
    );
  } else {
    console.log(chalk.red("  ✗ 未配置"));
  }

  console.log("");
  console.log(chalk.gray("Pro Plan:"));
  if (pro?.api_key) {
    console.log(
      chalk.green(`  ✓ API Key: ${pro.api_key.slice(0, 6)}…`),
    );
    console.log(
      chalk.gray(`  默认模型: ${pro.model || ""}`),
    );
  } else {
    console.log(chalk.red("  ✗ 未配置"));
  }

  console.log("");
  console.log(chalk.gray("Enterprise Plan:"));
  if (enterprise?.api_key) {
    console.log(
      chalk.green(`  ✓ API Key: ${enterprise.api_key.slice(0, 6)}…`),
    );
    console.log(
      chalk.gray(`  默认模型: ${enterprise.model || ""}`),
    );
  } else {
    console.log(chalk.red("  ✗ 未配置"));
  }

  console.log("");
  console.log(chalk.gray("按量付费:"));
  if (payg?.api_key) {
    console.log(
      chalk.green(`  ✓ API Key: ${payg.api_key.slice(0, 6)}…`),
    );
    console.log(
      chalk.gray(`  默认模型: ${payg.model || ""}`),
    );
  } else {
    console.log(chalk.red("  ✗ 未配置"));
  }

  console.log("");
  console.log(chalk.gray("OpenCode 状态:"));
  const detectedConfig = openCodeManager.detectCurrentConfig();
  if (detectedConfig.plan) {
    const planName =
      detectedConfig.plan === "ssy_cp_lite" ? "Lite Plan" : "Pro Plan";
    console.log(chalk.green(`  ✓ 已配置: ${planName}`));
    if (detectedConfig.apiKey) {
      console.log(
        chalk.gray(`  API Key: ${detectedConfig.apiKey.slice(0, 6)}…`),
      );
    }
  } else {
    console.log(chalk.red("  ✗ 未配置"));
  }

  console.log("");
  console.log(chalk.gray("OpenClaw 状态:"));
  const openClawConfig = openClawManager.detectCurrentConfig();
  if (openClawConfig.plan) {
    const planName =openClawConfig.plan === "ssy_cp_lite" ? "Lite Plan" : "Pro Plan";
    console.log(chalk.green(`  ✓ 已配置: ${planName}`));
    if (openClawConfig.apiKey) {
      console.log(
        chalk.gray(`  API Key: ${openClawConfig.apiKey.slice(0, 6)}…`),
      );
    }
  } else {
    console.log(chalk.red("  ✗ 未配置"));
  }
  console.log("");
}
