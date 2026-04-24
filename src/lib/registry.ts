import chalk from "chalk";
import { execSync, spawnSync } from "child_process";
import inquirer from "inquirer";
import ora from "ora";
import terminalLink from "terminal-link";
import { claudeIntegration } from "./claude-integration.js";
import { picoclawManager } from "./picoclaw-manager.js";
import { aiderManager } from "./aider-manager.js";
import { SUPPORTED_TOOLS, type Plan, type Tool } from "./constants.js";
import { locale } from "./locale.js";
import { nanobotManager } from "./nanobot-manager.js";
import { openClawManager } from "./openclaw-manager.js";
import { openCodeIntegration } from "./opencode-integration.js";
import { trackToolEvent } from "./tea-tracker.js";
import { codexManager } from "./codex-manager.js";
import { hermesManager } from "./hermes-manager.js";

interface PythonEnv {
  pythonCmd: string | null;
  pipCmd: string | null;
  version: string | null;
  meetsMinVersion: boolean;
}

export class IntegrationRegistry {
  private commandExists(cmd: string): boolean {
    try {
      const check =
        process.platform === "win32" ? `where ${cmd}` : `which ${cmd}`;
      execSync(check, { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }

  private runCommand(cmd: string): void {
    const result = spawnSync(cmd, { shell: true, encoding: "utf-8" });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) {
      const error = new Error(`Command failed: ${cmd}`) as Error & {
        stdout?: string;
        stderr?: string;
        status?: number | null;
      };
      error.stdout = result.stdout || "";
      error.stderr = result.stderr || "";
      error.status = result.status;
      throw error;
    }
  }

  private parsePythonVersion(versionStr: string): [number, number] | null {
    const match = versionStr.match(/(\d+)\.(\d+)/);
    if (!match) return null;
    return [parseInt(match[1], 10), parseInt(match[2], 10)];
  }

  private meetsMinPython(current: string, required: string): boolean {
    const cur = this.parsePythonVersion(current);
    const req = this.parsePythonVersion(required);
    if (!cur || !req) return false;
    return cur[0] > req[0] || (cur[0] === req[0] && cur[1] >= req[1]);
  }

  private canInstallPythonToolViaUv(tool: Tool): boolean {
    return (
      tool.runtime === "python" &&
      tool.name === "nanobot" &&
      this.commandExists("uv")
    );
  }

  detectPythonEnv(minVersion?: string): PythonEnv {
    const result: PythonEnv = {
      pythonCmd: null,
      pipCmd: null,
      version: null,
      meetsMinVersion: false,
    };

    for (const cmd of ["python3.11", "python3", "python"]) {
      if (!this.commandExists(cmd)) continue;
      try {
        const ver = execSync(`${cmd} --version`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        const parsed = this.parsePythonVersion(ver);
        if (!parsed || parsed[0] < 3) continue;
        result.pythonCmd = cmd;
        result.version = ver.replace(/^Python\s*/i, "");
        result.meetsMinVersion = minVersion
          ? this.meetsMinPython(result.version, minVersion)
          : true;
        break;
      } catch {
        /* skip */
      }
    }

    for (const cmd of ["pip3.11", "pip3", "pip"]) {
      if (!this.commandExists(cmd)) continue;
      try {
        const ver = execSync(`${cmd} --version`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (ver.includes("python 2")) continue;
        result.pipCmd = cmd;
        break;
      } catch {
        /* skip */
      }
    }

    if (!result.pipCmd && result.pythonCmd) {
      try {
        execSync(`${result.pythonCmd} -m pip --version`, { stdio: "pipe" });
        result.pipCmd = `${result.pythonCmd} -m pip`;
      } catch {
        /* skip */
      }
    }

    return result;
  }

  private getInstallCommand(tool: Tool, pyEnv: PythonEnv): string {
    if (tool.runtime !== "python") return tool.installCommand;
    const match = tool.installCommand.match(/^pip\s+install\s+(.+)$/);
    if (!match) return tool.installCommand;
    const pkg = match[1].trim();
    if (this.commandExists("uv")) return `uv tool install ${pkg}`;
    if (this.commandExists("pipx")) return `pipx install ${pkg}`;
    if (!pyEnv.pipCmd) return tool.installCommand;
    return `${pyEnv.pipCmd} install ${pkg}`;
  }

  isToolInstalled(toolName: string): boolean {
    const tool = SUPPORTED_TOOLS[toolName];
    if (!tool) return false;

    return this.commandExists(tool.command);
  }

  async installTool(toolName: string): Promise<void> {
    const tool = SUPPORTED_TOOLS[toolName];
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    if (tool.runtime === "python") {
      const canProceed = await this.checkPythonPrerequisites(tool);
      if (!canProceed) {
        throw new Error(locale.t("setup.user_cancelled"));
      }
    }

    const pyEnv =
      tool.runtime === "python"
        ? this.detectPythonEnv(tool.minPythonVersion)
        : null;
    const installCmd = pyEnv
      ? this.getInstallCommand(tool, pyEnv)
      : tool.installCommand;

    const spinner = ora(locale.t("ui.installing_tool")).start();
    try {
      spinner.info(chalk.gray("$ ") + chalk.white(installCmd));
      spinner.stop();
      this.runCommand(installCmd);
      spinner.succeed(locale.t("ui.tool_installed"));
    } catch (error) {
      const errorMessage =
        (error instanceof Error ? error.message : "") +
        ((error as { stderr?: Buffer | string })?.stderr?.toString() || "") +
        ((error as { stdout?: Buffer | string })?.stdout?.toString() || "");

      const isExternallyManagedEnv =
        errorMessage.includes("externally-managed-environment") ||
        errorMessage.includes("externally managed");

      if (tool.runtime === "python" && isExternallyManagedEnv) {
        const match = tool.installCommand.match(/^pip\s+install\s+(.+)$/);
        const pkg = match?.[1]?.trim();
        if (pkg && this.commandExists("uv")) {
          const uvCmd = `uv tool install ${pkg}`;
          try {
            spinner.info(chalk.gray("$ ") + chalk.white(uvCmd));
            spinner.stop();
            this.runCommand(uvCmd);
            spinner.succeed(locale.t("ui.tool_installed"));
            return;
          } catch {
            spinner.fail(locale.t("ui.install_failed"));
          }
        }
        if (
          pkg &&
          !this.commandExists("uv") &&
          process.platform === "darwin" &&
          this.commandExists("brew")
        ) {
          const brewInstallUvCmd = "brew install uv";
          try {
            spinner.info(chalk.gray("$ ") + chalk.white(brewInstallUvCmd));
            spinner.stop();
            this.runCommand(brewInstallUvCmd);
            const uvCmd = `uv tool install ${pkg}`;
            spinner.info(chalk.gray("$ ") + chalk.white(uvCmd));
            spinner.stop();
            this.runCommand(uvCmd);
            spinner.succeed(locale.t("ui.tool_installed"));
            return;
          } catch {
            spinner.fail(locale.t("ui.install_failed"));
          }
        }
        if (pkg && this.commandExists("pipx")) {
          const pipxCmd = `pipx install ${pkg}`;
          try {
            spinner.info(chalk.gray("$ ") + chalk.white(pipxCmd));
            spinner.stop();
            this.runCommand(pipxCmd);
            spinner.succeed(locale.t("ui.tool_installed"));
            return;
          } catch {
            spinner.fail(locale.t("ui.install_failed"));
          }
        } else {
          spinner.fail(locale.t("ui.install_failed"));
          console.log(
            chalk.yellow(
              "\n📌 检测到系统 Python 环境禁止 pip 写入（PEP 668）。建议使用 uv 或 pipx 安装：\n",
            ),
          );
          if (process.platform === "darwin") {
            console.log(chalk.white("  brew install uv"));
            console.log(chalk.white("  uv tool install nanobot-ai"));
            console.log("");
            console.log(chalk.white("  brew install pipx"));
            console.log(chalk.white("  pipx install nanobot-ai"));
          } else if (process.platform === "win32") {
            console.log(chalk.white("  pip install uv"));
            console.log(chalk.white("  uv tool install nanobot-ai"));
            console.log("");
            console.log(chalk.white("  python -m pip install --user pipx"));
            console.log(chalk.white("  pipx install nanobot-ai"));
          } else {
            console.log(
              chalk.white("  curl -LsSf https://astral.sh/uv/install.sh | sh"),
            );
            console.log(chalk.white("  uv tool install nanobot-ai"));
            console.log("");
            console.log(chalk.white("  sudo apt install pipx"));
            console.log(chalk.white("  pipx install nanobot-ai"));
          }
          throw new Error(`Failed to install ${tool.displayName}: ${error}`);
        }
      } else {
        spinner.fail(locale.t("ui.install_failed"));
      }

      const isPermissionError =
        errorMessage.includes("EACCES") ||
        errorMessage.includes("permission denied") ||
        errorMessage.includes("EPERM") ||
        (error as { status?: number }).status === 243;

      if (!isPermissionError) {
        if (toolName === "zeroclaw") {
          console.log(
            chalk.yellow("\n📌 ZeroClaw 安装失败，可以尝试手动安装：\n"),
          );
          console.log(chalk.cyan.bold("方案 1: Homebrew"));
          console.log(chalk.white("  brew install zeroclaw"));
          console.log("");
          console.log(chalk.cyan.bold("方案 2: 源码编译"));
          console.log(
            chalk.white(
              "  git clone https://github.com/zeroclaw-labs/zeroclaw.git",
            ),
          );
          console.log(chalk.white("  cd zeroclaw"));
          console.log(chalk.white("  ./bootstrap.sh"));
        }
        throw new Error(`Failed to install ${tool.displayName}: ${error}`);
      }

      console.log("\n⚠️  " + locale.t("setup.permission_detected") + "\n");

      if (tool.runtime === "python") {
        this.showPipPermissionHelp(installCmd);
      } else if (process.platform === "win32") {
        console.log(
          chalk.yellow("\n📌 " + locale.t("setup.windows_solutions")),
        );
        console.log("");
        console.log(chalk.cyan.bold("方案 1: 以管理员身份运行"));
        console.log(chalk.gray("  1. 以管理员身份打开 PowerShell"));
        console.log(chalk.gray("  2. 运行安装命令:"));
        console.log(chalk.white(`  ${installCmd}`));
      } else {
        console.log(chalk.yellow("\n📌 " + locale.t("setup.unix_solutions")));
        console.log("");
        console.log(chalk.cyan.bold(locale.t("setup.unix_solution_1_title")));
        console.log(
          chalk.gray("  " + locale.t("setup.unix_solution_1_desc")),
        );
        console.log(chalk.white(`  sudo ${installCmd}`));
        console.log("");

        const npmDocsUrl =
          "https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally";
        const clickableLink = terminalLink(npmDocsUrl, npmDocsUrl, {
          fallback: () => npmDocsUrl,
        });
        console.log(chalk.cyan.bold(locale.t("setup.unix_solution_2_title")));
        console.log(chalk.gray("  使用 nvm 管理 Node.js 版本"));
        console.log(chalk.blue("  📖 文档: ") + clickableLink);
      }

      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: locale.t("setup.what_next"),
          choices: [
            { name: locale.t("setup.installed_continue"), value: "continue" },
            { name: locale.t("setup.cancel_install"), value: "cancel" },
          ],
        },
      ]);

      if (action === "cancel") {
        throw new Error(locale.t("setup.user_cancelled"));
      }

      if (!this.isToolInstalled(toolName)) {
        console.log(
          chalk.red(
            "\n❌ " +
              locale.t("setup.still_not_installed", {
                tool: tool.displayName,
              }),
          ),
        );
        throw new Error(`${tool.displayName} is not installed`);
      }

      console.log(
        chalk.green(
          "\n✅ " +
            locale.t("setup.verified_success", { tool: tool.displayName }),
        ),
      );
    }
  }

  private async checkPythonPrerequisites(tool: Tool): Promise<boolean> {
    const pyEnv = this.detectPythonEnv(tool.minPythonVersion);
    const minVer = tool.minPythonVersion || "3.11";
    const issues: string[] = [];
    const canUseUvInstall = this.canInstallPythonToolViaUv(tool);

    if (!pyEnv.pythonCmd && !canUseUvInstall) {
      issues.push("python_not_found");
    } else if (!pyEnv.meetsMinVersion && !canUseUvInstall) {
      issues.push("python_version_low");
    }

    if (!pyEnv.pipCmd && !canUseUvInstall) {
      issues.push("pip_not_found");
    }

    if (issues.length === 0) return true;

    console.log(
      chalk.red("\n❌ " + locale.t("setup.python_prereq_failed") + "\n"),
    );

    if (issues.includes("python_not_found")) {
      console.log(
        chalk.red(`  ✗ Python: ${locale.t("setup.python_not_found")}`),
      );
    } else if (issues.includes("python_version_low")) {
      console.log(
        chalk.red(
          `  ✗ Python ${pyEnv.version} (${locale.t("setup.python_version_required", { version: minVer })})`,
        ),
      );
    } else {
      console.log(chalk.green(`  ✓ Python ${pyEnv.version}`));
    }

    if (issues.includes("pip_not_found")) {
      console.log(chalk.red(`  ✗ pip: ${locale.t("setup.pip_not_found")}`));
    } else {
      console.log(chalk.green(`  ✓ pip (${pyEnv.pipCmd})`));
    }

    console.log("");
    console.log(
      chalk.yellow("📌 " + locale.t("setup.python_install_guide") + ":"),
    );
    console.log("");

    if (
      issues.includes("python_not_found") ||
      issues.includes("python_version_low")
    ) {
      if (process.platform === "darwin") {
        console.log(chalk.cyan.bold(locale.t("setup.python_solution_brew")));
        console.log(chalk.white(`  brew install python@${minVer}`));
        console.log("");
        console.log(chalk.cyan.bold(locale.t("setup.python_solution_pyenv")));
        console.log(chalk.white(`  curl https://pyenv.run | bash`));
        console.log(chalk.white(`  pyenv install ${minVer}`));
        console.log(chalk.white(`  pyenv global ${minVer}`));

        if (tool.name === "nanobot") {
          console.log("");
          console.log(
            chalk.yellow("💡 Nanobot 示例命令（macOS，可直接复制）："),
          );
          console.log(chalk.white(`  brew install python@${minVer}`));
          console.log(chalk.white("  python3 -m ensurepip --upgrade"));
          console.log(chalk.white("  python3 -m pip install --upgrade pip"));
          console.log(chalk.white("  python3 -m pip install nanobot-ai"));
        }
      } else if (process.platform === "win32") {
        console.log(
          chalk.cyan.bold(locale.t("setup.python_solution_download")),
        );
        const pyUrl = `https://www.python.org/downloads/`;
        const clickableUrl = terminalLink(pyUrl, pyUrl, {
          fallback: () => pyUrl,
        });
        console.log(chalk.white("  ") + clickableUrl);
        console.log("");
        console.log(
          chalk.cyan.bold(locale.t("setup.python_solution_winget")),
        );
        console.log(chalk.white(`  winget install Python.Python.3.11`));

        if (tool.name === "nanobot") {
          console.log("");
          console.log(
            chalk.yellow("💡 Nanobot 示例命令（Windows，可直接复制）："),
          );
          console.log(chalk.white("  python -m ensurepip --upgrade"));
          console.log(chalk.white("  python -m pip install --upgrade pip"));
          console.log(chalk.white("  python -m pip install nanobot-ai"));
        }
      } else {
        console.log(chalk.cyan.bold(locale.t("setup.python_solution_apt")));
        console.log(
          chalk.white(
            `  sudo apt update && sudo apt install python${minVer} python${minVer}-venv`,
          ),
        );
        console.log("");
        console.log(chalk.cyan.bold(locale.t("setup.python_solution_pyenv")));
        console.log(chalk.white(`  curl https://pyenv.run | bash`));
        console.log(chalk.white(`  pyenv install ${minVer}`));

        if (tool.name === "nanobot") {
          console.log("");
          console.log(
            chalk.yellow("💡 Nanobot 示例命令（Linux，可直接复制）："),
          );
          console.log(
            chalk.white(
              `  sudo apt update && sudo apt install python${minVer} python${minVer}-venv python3-pip`,
            ),
          );
          console.log(chalk.white("  python3 -m ensurepip --upgrade"));
          console.log(chalk.white("  python3 -m pip install --upgrade pip"));
          console.log(chalk.white("  python3 -m pip install nanobot-ai"));
        }
      }
    } else if (issues.includes("pip_not_found")) {
      console.log(chalk.cyan.bold(locale.t("setup.pip_install_guide")));
      if (process.platform === "win32") {
        console.log(
          chalk.white(
            `  ${pyEnv.pythonCmd || "python"} -m ensurepip --upgrade`,
          ),
        );
      } else {
        console.log(
          chalk.white(
            `  ${pyEnv.pythonCmd || "python3"} -m ensurepip --upgrade`,
          ),
        );
        console.log("");
        console.log(chalk.gray("  " + locale.t("setup.pip_alt_apt")));
        console.log(chalk.white(`  sudo apt install python3-pip`));
      }

      if (tool.name === "nanobot") {
        console.log("");
        console.log(chalk.yellow("💡 Nanobot 示例命令（可直接复制）："));
        if (process.platform === "win32") {
          console.log(
            chalk.white(
              `  ${pyEnv.pythonCmd || "python"} -m ensurepip --upgrade`,
            ),
          );
          console.log(
            chalk.white(
              `  ${pyEnv.pythonCmd || "python"} -m pip install --upgrade pip`,
            ),
          );
          console.log(
            chalk.white(
              `  ${pyEnv.pythonCmd || "python"} -m pip install nanobot-ai`,
            ),
          );
        } else {
          console.log(
            chalk.white(
              `  ${pyEnv.pythonCmd || "python3"} -m ensurepip --upgrade`,
            ),
          );
          console.log(
            chalk.white(
              `  ${pyEnv.pythonCmd || "python3"} -m pip install --upgrade pip`,
            ),
          );
          console.log(
            chalk.white(
              `  ${pyEnv.pythonCmd || "python3"} -m pip install nanobot-ai`,
            ),
          );
        }
      }
    }
    console.log("");

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: locale.t("setup.what_next"),
        choices: [
          { name: locale.t("setup.installed_continue"), value: "continue" },
          { name: locale.t("setup.cancel_install"), value: "cancel" },
        ],
      },
    ]);

    if (action === "cancel") return false;

    const rechecked = this.detectPythonEnv(tool.minPythonVersion);
    if (!rechecked.pipCmd || !rechecked.meetsMinVersion) {
      console.log(
        chalk.red("\n❌ " + locale.t("setup.python_still_not_ready")),
      );
      return false;
    }

    console.log(
      chalk.green(
        "\n✅ " +
          locale.t("setup.python_env_ready", {
            version: rechecked.version || "",
          }),
      ),
    );
    return true;
  }

  private showPipPermissionHelp(installCmd: string): void {
    console.log(
      chalk.yellow(
        "\n📌 " + locale.t("setup.pip_permission_solutions") + ":",
      ),
    );
    console.log("");

    if (process.platform === "win32") {
      console.log(chalk.cyan.bold(locale.t("setup.pip_solution_admin")));
      console.log(
        chalk.gray("  1. " + locale.t("setup.pip_open_admin_shell")),
      );
      console.log(chalk.white(`  ${installCmd}`));
    } else {
      console.log(chalk.cyan.bold(locale.t("setup.pip_solution_user")));
      console.log(chalk.white(`  ${installCmd} --user`));
      console.log("");
      console.log(chalk.cyan.bold(locale.t("setup.pip_solution_venv")));
      console.log(chalk.white(`  python3 -m venv ~/.nanobot-venv`));
      console.log(chalk.white(`  source ~/.nanobot-venv/bin/activate`));
      console.log(chalk.white(`  ${installCmd}`));
      console.log("");
      console.log(chalk.cyan.bold(locale.t("setup.pip_solution_pipx")));
      console.log(chalk.white(`  pipx install nanobot-ai`));
    }
  }

  async loadPlanConfig(
    toolName: string,
    plan: Plan,
    apiKey: string,
    model?: string,
  ): Promise<void> {
    if (toolName === "opencode") {
      openCodeIntegration.loadPlanConfig(plan, apiKey, model);
    } else if (toolName === "claude-code") {
      await claudeIntegration.loadPlanConfig(plan, apiKey, model);
    } else if (toolName === "openclaw") {
      openClawManager.loadPlanConfig(plan, apiKey, model);
    } else if (toolName === "nanobot") {
      await nanobotManager.loadPlanConfig(plan, apiKey, model);
    } else if (toolName === "picoclaw") {
      await picoclawManager.loadPlanConfig(plan, apiKey, model);
    } else if (toolName === "codex") {
      await codexManager.loadPlanConfig(plan, apiKey, model);
    } else if (toolName === "aider") {
      await aiderManager.loadPlanConfig(plan, apiKey, model);
    } else if (toolName === "hermes") {
      await hermesManager.loadPlanConfig(plan, apiKey, model);
    } else {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    trackToolEvent("set", toolName);
  }

  unloadPlanConfig(toolName: string, planId?: string): void {
    if (toolName === "opencode") {
      openCodeIntegration.unloadPlanConfig(planId);
    } else if (toolName === "claude-code") {
      claudeIntegration.unloadPlanConfig();
    } else if (toolName === "openclaw") {
      openClawManager.unloadPlanConfig(planId);
    } else if (toolName === "nanobot") {
      nanobotManager.unloadPlanConfig(planId);
    } else if (toolName === "picoclaw") {
      picoclawManager.unloadPlanConfig();
    } else if (toolName === "codex") {
      codexManager.unloadPlanConfig();
    } else if (toolName === "aider") {
      aiderManager.unloadPlanConfig();
    } else if (toolName === "hermes") {
      hermesManager.unloadPlanConfig();
    } else {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    trackToolEvent("unset", toolName);
  }

  getSupportedTools() {
    return Object.values(SUPPORTED_TOOLS);
  }

  getInstalledTools(): string[] {
    return Object.keys(SUPPORTED_TOOLS).filter((toolName) =>
      this.isToolInstalled(toolName),
    );
  }
}

export const registry = new IntegrationRegistry();
