package adapter

import (
	"fmt"
	"context"
	"strings"
	"path/filepath"
	"github.com/shengsuan/coding-helper/internal/models"
	"github.com/shengsuan/coding-helper/internal/tool"
	"github.com/shengsuan/coding-helper/internal/tool/configfile"
)

type Adapter struct {
	Kind, Home, Path string
	Files            configfile.FS
}

func New(kind, home, path string, fs configfile.FS) *Adapter {
	if fs == nil {
		fs = configfile.OSFS{}
	}
	return &Adapter{Kind: kind, Home: home, Path: path, Files: fs}
}
func (a *Adapter) Requirements() tool.Requirements {
	p := models.ProtocolOpenAIChat
	all := false
	switch a.Kind {
	case "claude", "opencodereview":
		p = models.ProtocolAnthropic
	case "codex", "grok-build":
		p = models.ProtocolOpenAIResponses
	case "opencode", "openclaw":
		all = true
	}
	return tool.Requirements{Protocols: []models.Protocol{p}, NeedsModel: true, NeedsAllModels: all}
}
func (a *Adapter) Apply(_ context.Context, r tool.ApplyRequest) error {
	j, y, t := configfile.JSON(a.Files), configfile.YAML(a.Files), configfile.TOML(a.Files)
	path := r.Descriptor.ConfigPath
	p, m := r.Plan, r.Model.ID
	switch a.Kind {
	case "aider":
		c, e := y.Load(path)
		if e != nil {
			return e
		}
		c["openai-api-key"], c["openai-api-base"], c["model"], c["ssy-code-plan"] = r.APIKey, p.BaseURL, "openai/"+m, r.PlanID
		return y.Save(path, c)
	case "hermes":
		c, e := y.Load(path)
		if e != nil {
			return e
		}
		root := obj(c["model"])
		root["ssy_code_plan"], root["provider"], root["api_key"], root["base_url"], root["default"] = r.PlanID, "custom", r.APIKey, p.BaseURL, m
		c["model"] = root
		return y.Save(path, c)
	case "deepseek":
		if !strings.Contains(m, "/deepseek") {
			return fmt.Errorf("模型 %s 不符合 DeepSeek 要求（需包含 /deepseek）", m)
		}
		c, e := t.Load(path)
		if e != nil {
			return e
		}
		c["api_key"], c["base_url"], c["default_text_model"], c["ssy_code_plan"] = r.APIKey, p.BaseURL, m, r.PlanID
		return t.Save(path, c)
	case "codex":
		c, e := t.Load(path)
		if e != nil {
			return e
		}
		c["model"], c["openai_base_url"], c["ssy_code_plan_id"] = m, p.BaseURL, r.PlanID
		n := obj(c["notice"])
		mg := obj(n["model_migrations"])
		mg[short(m)] = m
		n["model_migrations"] = mg
		c["notice"] = n
		if e = t.Save(path, c); e != nil {
			return e
		}
		auth, e := j.Load(filepath.Join(a.Home, ".codex", "auth.json"))
		if e != nil {
			return e
		}
		auth["OPENAI_API_KEY"] = r.APIKey
		return j.Save(filepath.Join(a.Home, ".codex", "auth.json"), auth)
	case "claude":
		c, e := j.Load(path)
		if e != nil {
			return e
		}
		env := obj(c["env"])
		for _, k := range []string{"ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_MODEL", "API_TIMEOUT_MS", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "CLAUDE_CODE_ATTRIBUTION_HEADER", "CC_CP_SSY"} {
			delete(env, k)
		}
		env["ANTHROPIC_AUTH_TOKEN"], env["ANTHROPIC_API_KEY"], env["ANTHROPIC_BASE_URL"], env["ANTHROPIC_MODEL"] = r.APIKey, r.APIKey, p.BaseURL, m
		env["API_TIMEOUT_MS"], env["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"], env["CLAUDE_CODE_ATTRIBUTION_HEADER"], env["CC_CP_SSY"] = "3000000", 1, 0, r.PlanID
		c["env"] = env
		if e = j.Save(path, c); e != nil {
			return e
		}
		mc, e := j.Load(filepath.Join(a.Home, ".claude.json"))
		if e != nil {
			return e
		}
		if _, ok := mc["hasCompletedOnboarding"]; !ok {
			mc["hasCompletedOnboarding"] = true
		}
		return j.Save(filepath.Join(a.Home, ".claude.json"), mc)
	case "opencode":
		c, e := j.Load(path)
		if e != nil {
			return e
		}
		delete(c, "defaultModel")
		providers := obj(c["provider"])
		entries := map[string]any{}
		for _, x := range r.Models {
			entries[x.ID] = map[string]any{"name": x.ID, "limit": map[string]any{"context": x.ContextSize, "output": 4096}}
		}
		providers[r.PlanID] = map[string]any{"npm": "@ai-sdk/openai-compatible", "name": p.Label, "options": map[string]any{"baseURL": p.BaseURL, "apiKey": r.APIKey}, "models": entries}
		c["$schema"], c["model"], c["provider"] = "https://opencode.ai/config.json", r.PlanID+"/"+m, providers
		return j.Save(path, c)
	case "openclaw":
		c, e := j.Load(path)
		if e != nil {
			return e
		}
		root := obj(c["models"])
		providers := obj(root["providers"])
		list := []any{}
		for _, x := range r.Models {
			list = append(list, map[string]any{"id": x.ID, "name": x.ID, "contextWindow": x.ContextSize, "maxTokens": x.MaxTokens})
		}
		providers[r.PlanID] = map[string]any{"baseUrl": p.BaseURL, "apiKey": r.APIKey, "api": "openai-completions", "models": list}
		root["providers"] = providers
		c["models"] = root
		agents := obj(c["agents"])
		d := obj(agents["defaults"])
		d["model"] = map[string]any{"primary": r.PlanID + "/" + m}
		agents["defaults"] = d
		c["agents"] = agents
		return j.Save(path, c)
	case "picoclaw":
		c, e := j.Load(path)
		if e != nil {
			return e
		}
		name := r.PlanID + "__" + short(m)
		agents := obj(c["agents"])
		prior := obj(agents["defaults"])
		agents["secondary"] = prior
		d := obj(prior)
		d["provider"], d["model_name"] = "shengsuanyun", name
		agents["defaults"] = d
		c["agents"] = agents
		c["model_list"] = append(arr(c["model_list"]), map[string]any{"model_name": name, "model": "shengsuanyun/" + m, "api_base": p.BaseURL})
		if e = j.Save(path, c); e != nil {
			return e
		}
		sec, e := y.Load(filepath.Join(a.Home, ".picoclaw", ".security.yml"))
		if e != nil {
			return e
		}
		ml := obj(sec["model_list"])
		ml[name] = map[string]any{"api_keys": []any{r.APIKey}}
		sec["model_list"] = ml
		return y.Save(filepath.Join(a.Home, ".picoclaw", ".security.yml"), sec)
	case "opencodereview":
		c, e := j.Load(path)
		if e != nil {
			return e
		}
		c["llm"] = map[string]any{"url": strings.TrimRight(p.BaseURL, "/") + "/v1/messages", "auth_token": r.APIKey, "model": m, "use_anthropic": true}
		return j.Save(path, c)
	case "grok-build":
		c, e := t.Load(path)
		if e != nil {
			return e
		}
		ends := obj(c["endpoints"])
		ends["models_base_url"] = p.BaseURL
		providers := obj(c["model"])
		providers["shengsuanyun"] = map[string]any{"api_key": r.APIKey, "model": m, "base_url": p.BaseURL}
		ms := obj(c["models"])
		ms["default"] = "shengsuanyun"
		c["endpoints"], c["model"], c["models"] = ends, providers, ms
		return t.Save(path, c)
	case "nanobot":
		return a.nanobot(j, path, r)
	}
	return fmt.Errorf("unknown adapter: %s", a.Kind)
}
func (a *Adapter) Clear(_ context.Context) error {
	j, y, t := configfile.JSON(a.Files), configfile.YAML(a.Files), configfile.TOML(a.Files)
	path := a.path()
	var c map[string]any
	var e error
	switch a.Kind {
	case "aider":
		c, e = y.Load(path)
		if e == nil {
			del(c, "openai-api-key", "openai-api-base", "model", "ssy-code-plan")
			return y.Save(path, c)
		}
	case "hermes":
		c, e = y.Load(path)
		if e == nil {
			r := obj(c["model"])
			if _, ok := r["ssy_code_plan"]; ok {
				del(r, "ssy_code_plan")
				if s, _ := r["base_url"].(string); strings.Contains(s, "shengsuanyun") {
					r["api_key"], r["base_url"] = "", ""
				}
			}
			c["model"] = r
			return y.Save(path, c)
		}
	case "deepseek":
		c, e = t.Load(path)
		if e == nil {
			if _, ok := c["ssy_code_plan"]; ok {
				del(c, "api_key", "base_url", "ssy_code_plan")
				c["default_text_model"] = "deepseek-v4-pro"
			}
			return t.Save(path, c)
		}
	case "opencode":
		c, e = j.Load(path)
		if e == nil {
			del(c, "model")
			return j.Save(path, c)
		}
	case "openclaw":
		c, e = j.Load(path)
		if e == nil {
			ag := obj(c["agents"])
			d := obj(ag["defaults"])
			del(d, "model")
			ag["defaults"] = d
			c["agents"] = ag
			return j.Save(path, c)
		}
	case "picoclaw":
		c, e = j.Load(path)
		if e == nil {
			ag := obj(c["agents"])
			if s, ok := ag["secondary"].(map[string]any); ok {
				ag["defaults"] = s
			}
			c["agents"] = ag
			return j.Save(path, c)
		}
	case "claude":
		c, e = j.Load(path)
		if e == nil {
			env := obj(c["env"])
			del(env, "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_MODEL", "API_TIMEOUT_MS", "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "CLAUDE_CODE_ATTRIBUTION_HEADER", "CC_CP_SSY")
			c["env"] = env
			return j.Save(path, c)
		}
	case "opencodereview":
		c, e = j.Load(path)
		if e == nil {
			del(c, "llm")
			return j.Save(path, c)
		}
	case "nanobot":
		c, e = j.Load(path)
		if e == nil {
			providers := obj(c["providers"])
			for _, p := range []string{"volcengineCodingPlan", "byteplusCodingPlan"} {
				if x, ok := providers[p].(map[string]any); ok {
					x["apiKey"], x["apiBase"] = "", nil
				}
			}
			delete(providers, "custom")
			c["providers"] = providers
			ag := obj(c["agents"])
			d := obj(ag["defaults"])
			if p, _ := d["provider"].(string); p == "custom" || p == "volcengine_coding_plan" || p == "byteplus_coding_plan" {
				del(d, "model", "provider")
			}
			ag["defaults"] = d
			c["agents"] = ag
			return j.Save(path, c)
		}
	case "grok-build":
		c, e = t.Load(path)
		if e == nil {
			providers := obj(c["model"])
			delete(providers, "shengsuanyun")
			if len(providers) == 0 {
				delete(c, "model")
			} else {
				c["model"] = providers
			}
			ms := obj(c["models"])
			if ms["default"] == "shengsuanyun" {
				delete(ms, "default")
			}
			if len(ms) == 0 {
				delete(c, "models")
			} else {
				c["models"] = ms
			}
			ends := obj(c["endpoints"])
			if base, _ := ends["models_base_url"].(string); strings.Contains(base, "router.shengsuanyun.com") {
				delete(ends, "models_base_url")
			}
			if len(ends) == 0 {
				delete(c, "endpoints")
			} else {
				c["endpoints"] = ends
			}
			return t.Save(path, c)
		}
	case "codex":
		c, e = t.Load(path)
		if e == nil {
			if _, ok := c["ssy_code_plan_id"]; ok {
				del(c, "openai_base_url", "ssy_code_plan_id")
				c["model"] = "gpt-5.3-codex"
			}
			if e = t.Save(path, c); e != nil {
				return e
			}
			auth, e := j.Load(filepath.Join(a.Home, ".codex", "auth.json"))
			if e != nil {
				return e
			}
			del(auth, "OPENAI_API_KEY")
			return j.Save(filepath.Join(a.Home, ".codex", "auth.json"), auth)
		}
	}
	return e
}
func (a *Adapter) path() string { return a.Path }
func (a *Adapter) nanobot(j configfile.Codec, path string, r tool.ApplyRequest) error {
	providers := map[string]struct{ provider, agent string }{"ssy_cp_lite": {"volcengineCodingPlan", "volcengine_coding_plan"}, "ssy_cp_pro": {"byteplusCodingPlan", "byteplus_coding_plan"}}
	mapping, ok := providers[r.PlanID]
	if !ok {
		return fmt.Errorf("Nanobot 不支持套餐：%s", r.PlanID)
	}
	c, e := j.Load(path)
	if e != nil {
		return e
	}
	configured := obj(c["providers"])
	isNew := false
	for _, candidate := range providers {
		if _, exists := configured[candidate.provider]; exists {
			isNew = true
			break
		}
	}
	active, obsolete, agent := "custom", mapping.provider, "custom"
	if isNew {
		active, obsolete, agent = mapping.provider, "custom", mapping.agent
	}
	delete(configured, obsolete)
	configured[active] = map[string]any{"apiKey": r.APIKey, "apiBase": "https://router.shengsuanyun.com/api/cp/v1"}
	agents := obj(c["agents"])
	defaults := obj(agents["defaults"])
	defaults["model"], defaults["provider"] = r.Model.ID, agent
	agents["defaults"] = defaults
	c["agents"], c["providers"] = agents, configured
	return j.Save(path, c)
}
func obj(v any) map[string]any {
	if x, ok := v.(map[string]any); ok {
		return x
	}
	return map[string]any{}
}
func arr(v any) []any {
	if x, ok := v.([]any); ok {
		return x
	}
	return []any{}
}
func del(m map[string]any, ks ...string) {
	for _, k := range ks {
		delete(m, k)
	}
}
func short(s string) string {
	if i := strings.LastIndex(s, "/"); i >= 0 {
		return s[i+1:]
	}
	return s
}
