import chalk from "chalk";
import { settings as configManager } from "../lib/settings.js";
import { locale as i18n } from "../lib/locale.js";

export async function langCommand(args: string[]): Promise<void> {
  const [action, locale] = args;

  if (action === "show" || !action) {
    const currentLang = configManager.getLang();
    console.log(
      chalk.bold(`\n${i18n.t("lang.current")}: `) + chalk.cyan(currentLang),
    );
    console.log("");
    return;
  }

  if (action === "set") {
    if (!locale || (locale !== "zh_CN" && locale !== "en_US")) {
      console.log(chalk.red("\n用法: coding-helper lang set <zh_CN|en_US>\n"));
      return;
    }

    configManager.setLang(locale);
    i18n.setLocale(locale);
    console.log(
      chalk.green("\n✓ " + i18n.t("lang.set_success") + ": " + locale),
    );
    console.log("");
    return;
  }

  console.log(chalk.red("\n用法:"));
  console.log(chalk.gray("  coding-helper lang show        # 显示当前语言"));
  console.log(chalk.gray("  coding-helper lang set zh_CN   # 设置为中文"));
  console.log(chalk.gray("  coding-helper lang set en_US   # 设置为英文"));
  console.log("");
}
