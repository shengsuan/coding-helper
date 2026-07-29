package app

import "path/filepath"

// DefaultPlans returns the built-in plan catalog. Plans already present in
// the user's config.json are left untouched; only missing ones are added.
func DefaultPlans() map[string]Plan {
	return map[string]Plan{
		"pay_as_you_go": {
			Label:   "按量付费",
			BaseURL: "https://router.shengsuanyun.com/api/v1",
			APIKey:  []ApiKey{},
		},
	}
}

// DefaultTools returns the fixed tool catalog. Tools are not user-editable;
// they are always derived from this function so the binary controls them.
func DefaultTools(home string) map[string]Tool {
	return map[string]Tool{
		"claude": {
			Name:           "claude",
			Command:        "claude",
			InstallCommand: "npm install -g @anthropic-ai/claude-code",
			ConfigPath:     filepath.Join(home, ".claude", "settings.json"),
			DisplayName:    "Claude Code",
			Runtime:        "node",
		},
		"opencode": {
			Name:           "opencode",
			Command:        "opencode",
			InstallCommand: "npm install -g opencode-ai",
			ConfigPath:     filepath.Join(home, ".config", "opencode", "opencode.json"),
			DisplayName:    "OpenCode",
			Runtime:        "node",
		},
		"openclaw": {
			Name:           "openclaw",
			Command:        "openclaw",
			InstallCommand: "npm install -g openclaw",
			ConfigPath:     filepath.Join(home, ".openclaw", "openclaw.json"),
			DisplayName:    "OpenClaw",
			Runtime:        "node",
		},
		"picoclaw": {
			Name:           "picoclaw",
			Command:        "picoclaw",
			InstallCommand: "brew install picoclaw",
			ConfigPath:     filepath.Join(home, ".picoclaw", "config.json"),
			DisplayName:    "PicoClaw",
			Runtime:        "go",
		},
		"codex": {
			Name:           "codex",
			Command:        "codex",
			InstallCommand: "npm install -g @openai/codex",
			ConfigPath:     filepath.Join(home, ".codex", "config.toml"),
			DisplayName:    "Codex",
			Runtime:        "rust",
		},
		"aider": {
			Name:           "aider",
			Command:        "aider",
			InstallCommand: "pip install aider-install && aider-install",
			ConfigPath:     filepath.Join(home, ".aider.conf.yml"),
			DisplayName:    "Aider",
			Runtime:        "python",
		},
		"hermes": {
			Name:           "hermes",
			Command:        "hermes",
			InstallCommand: "curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash",
			ConfigPath:     filepath.Join(home, ".hermes", "config.yaml"),
			DisplayName:    "Hermes Agent",
			Runtime:        "python",
		},
		"deepseek": {
			Name:           "deepseek",
			Command:        "deepseek",
			InstallCommand: "npm install -g deepseek-tui",
			ConfigPath:     filepath.Join(home, ".deepseek", "config.toml"),
			DisplayName:    "DeepSeek TUI",
			Runtime:        "rust",
		},
		"opencodereview": {
			Name:           "opencodereview",
			Command:        "ocr",
			InstallCommand: "npm install -g @alibaba-group/open-code-review",
			ConfigPath:     filepath.Join(home, ".opencodereview", "config.json"),
			DisplayName:    "OpenCodeReview",
			Runtime:        "go",
		},
		"grok-build": {
			Name:           "grok-build",
			Command:        "grok",
			InstallCommand: "curl -fsSL https://x.ai/cli/install.sh | bash",
			ConfigPath:     filepath.Join(home, ".grok", "config.toml"),
			DisplayName:    "Grok Build",
			Runtime:        "rust",
		},
	}
}
