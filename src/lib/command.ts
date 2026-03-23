import { Command as Commander } from "commander";
import { locale } from "./locale.js";
import { settings } from "./settings.js";
import { setupFlow } from "./setup-flow.js";
import {
  langCommand,
  authCommand,
  doctorCommand,
  configCommand,
} from "../commands/index.js";
import chalk from "chalk";
import { createRequire } from "module";
import { track } from "./tea-tracker.js";

const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require("../../package.json");

export class Command {
  private program: Commander;

  constructor() {
    locale.loadFromConfig(settings.getLang());
    this.program = new Commander();
    this.build();
  }

  private build(): void {
    this.program
      .name("coding-helper")
      .description(locale.t("cli.title"))
      .version(PKG_VERSION, "-v, --version", locale.t("commands.version"))
      .helpOption("-h, --help", locale.t("commands.help"));

    this.registerLang();
    this.registerAuth();
    this.registerDoctor();
    this.registerEnter();
    this.registerInit();
    this.registerDefaultAction();
    this.addHelpExamples();
  }

  private registerInit(): void {
    this.program
      .command("init")
      .description(locale.t("commands.init"))
      .action(() => setupFlow.runFirstTimeSetup());
  }

  private registerLang(): void {
    const cmd = this.program.command("lang").description(locale.t("commands.lang"));

    cmd.command("show")
      .description(locale.t("lang.show_usage"))
      .action(() => langCommand(["show"]));

    cmd.command("set <locale>")
      .description(locale.t("lang.set_usage"))
      .action((loc: string) => langCommand(["set", loc]));
  }

  private registerAuth(): void {
    const cmd = this.program.command("auth").description(locale.t("commands.auth"));

    cmd.command("show")
      .description(locale.t("auth.show_desc"))
      .action(() => authCommand(["show"]));

    cmd.command("revoke [plan]")
      .description(locale.t("auth.revoke_desc"))
      .action((plan?: string) =>
        authCommand(["revoke", plan].filter(Boolean) as string[]),
      );

    cmd.command("reload [tool]")
      .description(locale.t("auth.reload_desc"))
      .action((tool?: string) =>
        authCommand(["reload", tool].filter(Boolean) as string[]),
      );

    cmd.argument("[plan]", "ssy_cp_lite | ssy_cp_pro | ssy_cp_enterprise | pay_as_you_go")
      .argument("[token]", "API token")
      .action(async (plan?: string, token?: string) => {
        const args = [plan, token].filter(Boolean) as string[];
        await authCommand(args);
      });
  }

  private registerDoctor(): void {
    this.program
      .command("doctor")
      .description(locale.t("commands.doctor"))
      .action(() => doctorCommand());
  }

  private registerEnter(): void {
    this.program
      .command("enter [section]")
      .description(locale.t("commands.config"))
      .action(async (section?: string) => {
        if (!section) {
          await setupFlow.showMainMenu();
        } else {
          await configCommand([section]);
        }
      });
  }

  private registerDefaultAction(): void {
    this.program.action(async () => {
      track("enter");
      if (settings.isFirstRun()) {
        console.log(chalk.cyan(locale.t("ui.welcome")));
        await setupFlow.runFirstTimeSetup();
      } else {
        await setupFlow.showMainMenu();
      }
    });
  }

  private addHelpExamples(): void {
    const ex = (cmd: string, comment: string) =>
      `  ${chalk.gray(`$ ${cmd}`)}  ${chalk.dim(`# ${comment}`)}`;

    this.program.addHelpText(
      "after",
      `\n${chalk.bold(locale.t("cli.examples"))}:\n` +
        [
          ex("coding-helper", "Interactive main menu"),
          ex("coding-helper init", "First-time setup wizard"),
          ex("coding-helper enter plan", "Jump to plan config"),
          ex("coding-helper enter opencode", "Jump to OpenCode config"),
          ex("coding-helper lang show", "Show current language"),
          ex("coding-helper lang set en_US", "Set language"),
          ex("coding-helper auth show", "Show auth status"),
          ex("coding-helper auth ssy_cp_lite <key>", "Set ShengSuanYun Coding plan API key"),
          ex("coding-helper auth revoke ssy_cp_lite", "Revoke API key"),
          ex("coding-helper doctor", "Run health check"),
        ].join("\n") +
        "\n",
    );
  }

  async execute(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv, { from: "user" });
    } catch (error) {
      if (error instanceof Error && error.name === "ExitPromptError") {
        process.exit(0);
      }
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  }
}
