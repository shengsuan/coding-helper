// Package config owns the data persisted by Coding Helper.
package config

type APIKey struct {
	Label string `json:"label,omitempty"`
	Key   string `json:"key,omitempty"`
}

type Plan struct {
	APIKey  []APIKey `json:"api_key,omitempty"`
	Model   string   `json:"model,omitempty"`
	Label   string   `json:"label,omitempty"`
	BaseURL string   `json:"base_url,omitempty"`
}

// Config deliberately retains Tools for backward-compatible reads of old
// config.json files. New code derives tool metadata from the catalog.
type Config struct {
	Lang      string            `json:"lang"`
	Plans     map[string]Plan   `json:"plans"`
	Tools     map[string]Tool   `json:"tools,omitempty"`
	ToolPlans map[string]string `json:"tool_plans,omitempty"`
	ToolKeys  map[string]string `json:"tool_keys,omitempty"`
}

type Tool struct {
	Name           string `json:"name"`
	Command        string `json:"command"`
	InstallCommand string `json:"installCommand"`
	ConfigPath     string `json:"configPath"`
	DisplayName    string `json:"displayName"`
	Runtime        string `json:"runtime,omitempty"`
	Description    string `json:"description,omitempty"`
}