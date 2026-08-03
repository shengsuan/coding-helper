package app

import (
	"path/filepath"
	"github.com/shengsuan/coding-helper/internal/tool"
	"github.com/shengsuan/coding-helper/internal/tool/adapter"
)

func DefaultTools(home string) (*tool.Registry, error) {
	d := func(id, name, cmd, display, runtime, path, program string, args ...string) tool.Definition {
		return tool.Definition{Descriptor: tool.Descriptor{ID: tool.ToolID(id), DisplayName: display, Command: cmd, Runtime: runtime, ConfigPath: path, Installer: tool.InstallSpec{Program: program, Args: args, Display: name}}}
	}
	defs := []tool.Definition{
		d("claude", "npm install -g @anthropic-ai/claude-code", "claude", "Claude Code", "node", filepath.Join(home, ".claude", "settings.json"), "npm", "install", "-g", "@anthropic-ai/claude-code"),
		d("opencode", "npm install -g opencode-ai", "opencode", "OpenCode", "node", filepath.Join(home, ".config", "opencode", "opencode.json"), "npm", "install", "-g", "opencode-ai"),
		d("nanobot", "pip install nanobot-ai", "nanobot", "Nanobot", "python", filepath.Join(home, ".nanobot", "config.json"), "pip", "install", "nanobot-ai"),
		d("openclaw", "npm install -g openclaw", "openclaw", "OpenClaw", "node", filepath.Join(home, ".openclaw", "openclaw.json"), "npm", "install", "-g", "openclaw"),
		d("picoclaw", "brew install picoclaw", "picoclaw", "PicoClaw", "go", filepath.Join(home, ".picoclaw", "config.json"), "brew", "install", "picoclaw"),
		d("codex", "npm install -g @openai/codex", "codex", "Codex", "rust", filepath.Join(home, ".codex", "config.toml"), "npm", "install", "-g", "@openai/codex"),
		d("aider", "pip install aider-install && aider-install", "aider", "Aider", "python", filepath.Join(home, ".aider.conf.yml"), "pip", "install", "aider-install"),
		d("hermes", "curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash", "hermes", "Hermes Agent", "python", filepath.Join(home, ".hermes", "config.yaml"), "curl", "-fsSL", "https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh"),
		d("deepseek", "npm install -g deepseek-tui", "deepseek", "DeepSeek TUI", "rust", filepath.Join(home, ".deepseek", "config.toml"), "npm", "install", "-g", "deepseek-tui"),
		d("opencodereview", "npm install -g @alibaba-group/open-code-review", "ocr", "OpenCodeReview", "go", filepath.Join(home, ".opencodereview", "config.json"), "npm", "install", "-g", "@alibaba-group/open-code-review"),
		d("grok", "curl -fsSL https://x.ai/cli/install.sh | bash", "grok", "Grok Build", "rust", filepath.Join(home, ".grok", "config.toml"), "curl", "-fsSL", "https://x.ai/cli/install.sh")}

	for i := range defs {
		defs[i].Adapter =adapter.New(string(defs[i].Descriptor.ID), home, defs[i].Descriptor.ConfigPath, nil)  
	}
	return tool.NewRegistry(defs)
}

func DefaultPlans() map[string]Plan {
	return map[string]Plan{
		"pay_as_you_go": {
			Label:   "按量付费",
			BaseURL: "https://router.shengsuanyun.com/api/v1",
			APIKey:  []ApiKey{},
		},
	}
}
