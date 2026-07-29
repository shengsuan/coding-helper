package app

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/pelletier/go-toml/v2"
	"gopkg.in/yaml.v3"
)

type Integration struct {
	home  string
	tools map[string]Tool
}

func NewIntegration(home string) *Integration { return &Integration{home: home, tools: DefaultTools(home)} }
func (i *Integration) Installed(name string) bool {
	t, ok := i.tools[name]
	return ok && commandExists(t.Command)
}

func (i *Integration) Install(name string) error {
	t, ok := i.tools[name]
	if !ok {
		return fmt.Errorf("未知工具：%s", name)
	}
	command := exec.Command("sh", "-c", t.InstallCommand)
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	return command.Run()
}

func (i *Integration) Configure(name, planID string, plan Plan, key, preferred string) error {
	tool, ok := i.tools[name]
	if !ok {
		return fmt.Errorf("未知工具：%s", name)
	}
	models, err := GetModels(plan, key)
	if err != nil {
		return err
	}
	endpoint := "/v1/chat/completions"
	switch name {
	case "claude", "opencodereview", "hermes":
		endpoint = "/v1/messages"
	case "codex", "deepseek", "grok-build":
		endpoint = "/v1/responses"
	}
	model, err := ValidateModel(models, preferred, endpoint)
	if err != nil {
		return err
	}
	switch name {
	case "codex":
		return i.codex(tool, planID, plan, key, model)
	case "claude":
		return i.claude(tool, planID, plan, key, model)
	case "opencode":
		return i.opencode(tool, planID, plan, key, model, models)
	case "openclaw":
		return i.openclaw(tool, planID, plan, key, model, models)
	case "picoclaw":
		return i.picoclaw(tool, planID, plan, key, model)
	case "aider":
		return i.aider(tool, planID, plan, key, model)
	case "hermes":
		return i.hermes(tool, planID, plan, key, model)
	case "deepseek":
		return i.deepseek(tool, planID, plan, key, model)
	case "opencodereview":
		return i.opencodeReview(tool, plan, key, model)
	case "grok-build":
		return i.grok(tool, plan, key, model)
	}
	return fmt.Errorf("不支持的工具：%s", name)
}

// Clear removes the ShengSuanYun-managed fields that Configure previously
// wrote into a tool's own configuration file, leaving the rest untouched.
func (i *Integration) Clear(name string) error {
	tool, ok := i.tools[name]
	if !ok {
		return fmt.Errorf("未知工具：%s", name)
	}
	switch name {
	case "codex":
		c := readTOML(tool.ConfigPath)
		deleteKeys(c, "model", "openai_base_url", "ssy_code_plan_id")
		if err := writeTOML(tool.ConfigPath, c); err != nil {
			return err
		}
		authPath := filepath.Join(i.home, ".codex", "auth.json")
		auth := readJSON(authPath)
		deleteKeys(auth, "OPENAI_API_KEY")
		return writeJSON(authPath, auth)
	case "claude":
		c := readJSON(tool.ConfigPath)
		env := object(c["env"])
		deleteKeys(env, "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_MODEL", "API_TIMEOUT_MS", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "CLAUDE_CODE_ATTRIBUTION_HEADER", "CC_CP_SSY")
		c["env"] = env
		return writeJSON(tool.ConfigPath, c)
	case "opencode":
		c := readJSON(tool.ConfigPath)
		deleteKeys(c, "model")
		return writeJSON(tool.ConfigPath, c)
	case "openclaw":
		c := readJSON(tool.ConfigPath)
		root := object(c["models"])
		agents := object(c["agents"])
		defaults := object(agents["defaults"])
		deleteKeys(defaults, "model")
		agents["defaults"] = defaults
		c["agents"] = agents
		c["models"] = root
		return writeJSON(tool.ConfigPath, c)
	case "picoclaw":
		c := readJSON(tool.ConfigPath)
		agents := object(c["agents"])
		defaults := object(agents["defaults"])
		deleteKeys(defaults, "provider", "model_name")
		agents["defaults"] = defaults
		c["agents"] = agents
		return writeJSON(tool.ConfigPath, c)
	case "aider":
		c := readYAML(tool.ConfigPath)
		deleteKeys(c, "openai-api-key", "openai-api-base", "model", "ssy-code-plan")
		return writeYAML(tool.ConfigPath, c)
	case "hermes":
		c := readYAML(tool.ConfigPath)
		deleteKeys(c, "model", "base_url", "api_key", "ssy_code_plan_id")
		return writeYAML(tool.ConfigPath, c)
	case "deepseek":
		c := readTOML(tool.ConfigPath)
		deleteKeys(c, "model", "api_base", "api_key", "ssy_code_plan_id")
		return writeTOML(tool.ConfigPath, c)
	case "opencodereview":
		c := readJSON(tool.ConfigPath)
		deleteKeys(c, "llm")
		return writeJSON(tool.ConfigPath, c)
	case "grok-build":
		c := readTOML(tool.ConfigPath)
		root := object(c["model"])
		deleteKeys(root, "sheng-suan-yun")
		c["model"] = root
		if err := writeTOML(tool.ConfigPath, c); err != nil {
			return err
		}
		authPath := filepath.Join(i.home, ".grok", "auth.json")
		auth := readJSON(authPath)
		deleteKeys(auth, "SHENGSUANYUN_API_KEY")
		return writeJSON(authPath, auth)
	}
	return fmt.Errorf("不支持的工具：%s", name)
}

func (i *Integration) codex(t Tool, planID string, p Plan, key, model string) error {
	c := readTOML(t.ConfigPath)
	c["model"], c["openai_base_url"], c["ssy_code_plan_id"] = model, p.BaseURL, planID
	notice := object(c["notice"])
	migrations := object(notice["model_migrations"])
	migrations[shortModel(model)] = model
	notice["model_migrations"] = migrations
	c["notice"] = notice
	if err := writeTOML(t.ConfigPath, c); err != nil {
		return err
	}
	authPath := filepath.Join(i.home, ".codex", "auth.json")
	auth := readJSON(authPath)
	auth["OPENAI_API_KEY"] = key
	return writeJSON(authPath, auth)
}

func (i *Integration) claude(t Tool, planID string, p Plan, key, model string) error {
	c := readJSON(t.ConfigPath)
	env := object(c["env"])
	for _, k := range []string{"ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_MODEL", "API_TIMEOUT_MS", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "CLAUDE_CODE_ATTRIBUTION_HEADER", "CC_CP_SSY"} {
		delete(env, k)
	}
	env["ANTHROPIC_AUTH_TOKEN"], env["ANTHROPIC_API_KEY"], env["ANTHROPIC_BASE_URL"], env["ANTHROPIC_MODEL"] = key, key, p.BaseURL, model
	env["API_TIMEOUT_MS"], env["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"], env["CLAUDE_CODE_ATTRIBUTION_HEADER"], env["CC_CP_SSY"] = "3000000", 1, 0, planID
	c["env"] = env
	if err := writeJSON(t.ConfigPath, c); err != nil {
		return err
	}
	mcpPath := filepath.Join(i.home, ".claude.json")
	mcp := readJSON(mcpPath)
	if _, ok := mcp["hasCompletedOnboarding"]; !ok {
		mcp["hasCompletedOnboarding"] = true
	}
	return writeJSON(mcpPath, mcp)
}

func (i *Integration) opencode(t Tool, planID string, p Plan, key, model string, models []Model) error {
	c := readJSON(t.ConfigPath)
	providers := object(c["provider"])
	entries := map[string]any{}
	for _, m := range models {
		entries[m.ID] = map[string]any{"name": m.ID, "limit": map[string]any{"context": m.ContextSize, "output": 4096}}
	}
	providers[planID] = map[string]any{"npm": "@ai-sdk/openai-compatible", "name": p.Label, "options": map[string]any{"baseURL": p.BaseURL, "apiKey": key}, "models": entries}
	c["$schema"], c["model"], c["provider"] = "https://opencode.ai/config.json", planID+"/"+model, providers
	return writeJSON(t.ConfigPath, c)
}

func (i *Integration) openclaw(t Tool, planID string, p Plan, key, model string, models []Model) error {
	c := readJSON(t.ConfigPath)
	root := object(c["models"])
	providers := object(root["providers"])
	list := make([]any, 0, len(models))
	for _, m := range models {
		list = append(list, map[string]any{"id": m.ID, "name": m.ID, "contextWindow": m.ContextSize, "maxTokens": m.MaxTokens})
	}
	providers[planID] = map[string]any{"baseUrl": p.BaseURL, "apiKey": key, "api": "openai-completions", "models": list}
	root["providers"] = providers
	c["models"] = root
	agents := object(c["agents"])
	defaults := object(agents["defaults"])
	defaults["model"] = map[string]any{"primary": planID + "/" + model}
	agents["defaults"] = defaults
	c["agents"] = agents
	return writeJSON(t.ConfigPath, c)
}

func (i *Integration) picoclaw(t Tool, planID string, p Plan, key, model string) error {
	c := readJSON(t.ConfigPath)
	modelName := planID + "__" + shortModel(model)
	agents := object(c["agents"])
	prior := object(agents["defaults"])
	agents["secondary"] = prior
	defaults := object(prior)
	defaults["provider"], defaults["model_name"] = "shengsuanyun", modelName
	agents["defaults"] = defaults
	c["agents"] = agents
	items := slice(c["model_list"])
	items = append(items, map[string]any{"model_name": modelName, "model": "shengsuanyun/" + model, "api_base": p.BaseURL})
	c["model_list"] = items
	if err := writeJSON(t.ConfigPath, c); err != nil {
		return err
	}
	path := filepath.Join(i.home, ".picoclaw", ".security.yml")
	sec := readYAML(path)
	ml := object(sec["model_list"])
	ml[modelName] = map[string]any{"api_keys": []any{key}}
	sec["model_list"] = ml
	return writeYAML(path, sec)
}

func (i *Integration) aider(t Tool, planID string, p Plan, key, model string) error {
	c := readYAML(t.ConfigPath)
	c["openai-api-key"], c["openai-api-base"], c["model"] = key, p.BaseURL, "openai/"+model
	c["ssy-code-plan"] = planID
	return writeYAML(t.ConfigPath, c)
}
func (i *Integration) hermes(t Tool, planID string, p Plan, key, model string) error {
	c := readYAML(t.ConfigPath)
	c["model"], c["base_url"], c["api_key"], c["ssy_code_plan_id"] = model, p.BaseURL, key, planID
	return writeYAML(t.ConfigPath, c)
}
func (i *Integration) deepseek(t Tool, planID string, p Plan, key, model string) error {
	c := readTOML(t.ConfigPath)
	c["model"], c["api_base"], c["api_key"], c["ssy_code_plan_id"] = model, p.BaseURL, key, planID
	return writeTOML(t.ConfigPath, c)
}
func (i *Integration) opencodeReview(t Tool, p Plan, key, model string) error {
	c := readJSON(t.ConfigPath)
	c["llm"] = map[string]any{"url": strings.TrimRight(p.BaseURL, "/") + "/v1/messages", "auth_token": key, "model": model, "use_anthropic": true}
	return writeJSON(t.ConfigPath, c)
}
func (i *Integration) grok(t Tool, p Plan, key, model string) error {
	c := readTOML(t.ConfigPath)
	root := object(c["model"])
	root["sheng-suan-yun"] = map[string]any{"model": model, "base_url": p.BaseURL, "name": model, "env_key": "SHENGSUANYUN_API_KEY"}
	c["model"] = root
	if err := writeTOML(t.ConfigPath, c); err != nil {
		return err
	}
	return writeJSON(filepath.Join(i.home, ".grok", "auth.json"), map[string]any{"SHENGSUANYUN_API_KEY": key})
}

func readJSON(path string) map[string]any {
	b, err := os.ReadFile(path)
	if err != nil {
		return map[string]any{}
	}
	var v map[string]any
	if json.Unmarshal(b, &v) != nil || v == nil {
		return map[string]any{}
	}
	return v
}
func writeJSON(path string, v map[string]any) error {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return writeFile(path, b)
}
func readYAML(path string) map[string]any {
	b, err := os.ReadFile(path)
	if err != nil {
		return map[string]any{}
	}
	var v map[string]any
	if yaml.Unmarshal(b, &v) != nil || v == nil {
		return map[string]any{}
	}
	return v
}
func writeYAML(path string, v map[string]any) error {
	b, err := yaml.Marshal(v)
	if err != nil {
		return err
	}
	return writeFile(path, b)
}
func readTOML(path string) map[string]any {
	b, err := os.ReadFile(path)
	if err != nil {
		return map[string]any{}
	}
	var v map[string]any
	if toml.Unmarshal(b, &v) != nil || v == nil {
		return map[string]any{}
	}
	return v
}
func writeTOML(path string, v map[string]any) error {
	b, err := toml.Marshal(v)
	if err != nil {
		return err
	}
	return writeFile(path, b)
}
func writeFile(path string, b []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	return os.WriteFile(path, b, 0600)
}
func object(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}
func slice(v any) []any {
	if s, ok := v.([]any); ok {
		return s
	}
	return []any{}
}
func shortModel(v string) string {
	if p := strings.LastIndex(v, "/"); p >= 0 {
		return v[p+1:]
	}
	return v
}
func deleteKeys(m map[string]any, keys ...string) {
	for _, k := range keys {
		delete(m, k)
	}
}
