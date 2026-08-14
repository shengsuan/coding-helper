package app

import (
	"path/filepath"
	"github.com/shengsuan/coding-helper/internal/tool"
	"github.com/shengsuan/coding-helper/internal/tool/adapter"
)

func DefaultTools(home string) (*tool.Registry, error) {
	d := func(id, name, cmd, display, runtime, path, description, program string, args ...string) tool.Definition {
		return tool.Definition{
			Descriptor: tool.Descriptor{
				ID: tool.ToolID(id), 
				DisplayName: display, 
				Command: cmd, 
				Runtime: runtime, 
				ConfigPath: path, 
				Description: description,
				Installer: tool.InstallSpec{ Program: program, Args: args, Display: name },
			},
		}
	}
	defs := []tool.Definition{
		d("claude", "npm install -g @anthropic-ai/claude-code", "claude", "Claude Code", "node", filepath.Join(home, ".claude", "settings.json"), "Work with Claude directly in your codebase. Build, debug, and ship from your terminal, IDE, Slack, web, and more.","npm", "install", "-g", "@anthropic-ai/claude-code"),
		d("opencode", "npm install -g opencode-ai", "opencode", "OpenCode", "node", filepath.Join(home, ".config", "opencode", "opencode.json"), "OpenCode is an open source AI coding agent. It’s available as a terminal-based interface, desktop app, or IDE extension.","npm", "install", "-g", "opencode-ai"),
		d("nanobot", "pip install nanobot-ai", "nanobot", "Nanobot", "python", filepath.Join(home, ".nanobot", "config.json"),"nanobot is an ultra-lightweight, open-source, self-hosted personal AI agent framework written in Python. It runs in a WebUI, terminal, or chat apps and combines tools, long-term memory, MCP integrations, model routing, multi-agent delegation, scheduled automation, and an OpenAI-compatible API in a small, readable core.", "pip", "install", "nanobot-ai"),
		d("openclaw", "npm install -g openclaw", "openclaw", "OpenClaw", "node", filepath.Join(home, ".openclaw", "openclaw.json"),"OpenClaw is a personal AI assistant that runs on your devices and meets you in the channels you already use. It is designed for a single operator and connects models, tools, messaging channels, and optional companion apps through one Gateway.", "npm", "install", "-g", "openclaw"),
		d("picoclaw", "brew install picoclaw", "picoclaw", "PicoClaw", "go", filepath.Join(home, ".picoclaw", "config.json"),"PicoClaw is an ultra-lightweight personal AI assistant inspired by NanoBot. It was rebuilt from the ground up in Go through a \"self-bootstrapping\" process — the AI Agent itself drove the architecture migration and code optimization.", "brew", "install", "picoclaw"),
		d("codex", "npm install -g @openai/codex", "codex", "Codex", "rust", filepath.Join(home, ".codex", "config.toml"),"Codex CLI is a coding agent from OpenAI that runs locally on your computer.", "npm", "install", "-g", "@openai/codex"),
		d("aider", "pip install aider-install && aider-install", "aider", "Aider", "python", filepath.Join(home, ".aider.conf.yml"),"AI Pair Programming in Your Terminal", "pip", "install", "aider-install"),
		d("hermes", "curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash", "hermes", "Hermes Agent", "python", filepath.Join(home, ".hermes", "config.yaml"), "Hermes Agent is an open-source coding agent from Nous Research.", "curl", "-fsSL", "https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh"),
		d("deepseek", "npm install -g deepseek-tui", "deepseek", "DeepSeek TUI", "rust", filepath.Join(home, ".deepseek", "config.toml"), "An open source coding agent for your terminal — bring your own model.","npm", "install", "-g", "deepseek-tui"),
		d("opencodereview", "npm install -g @alibaba-group/open-code-review", "ocr", "OpenCodeReview", "go", filepath.Join(home, ".opencodereview", "config.json"), "Open Code Review is an AI-powered code review CLI tool.","npm", "install", "-g", "@alibaba-group/open-code-review"),
		d("grok", "curl -fsSL https://x.ai/cli/install.sh | bash", "grok", "Grok Build", "rust", filepath.Join(home, ".grok", "config.toml"), "Grok Build is SpaceXAI's terminal-based AI coding agent. It runs as a full-screen TUI that understands your codebase, edits files, executes shell commands, searches the web, and manages long-running tasks — interactively, headlessly for scripting/CI, or embedded in editors via the Agent Client Protocol (ACP).","curl", "-fsSL", "https://x.ai/cli/install.sh")}

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
