package app

type Tool struct {
	Name           string `json:"name"`
	Command        string `json:"command"`
	InstallCommand string `json:"installCommand"`
	ConfigPath     string `json:"configPath"`
	DisplayName    string `json:"displayName"`
	Runtime        string `json:"runtime,omitempty"`
}
type ApiKey struct {
	Label string `json:"label,omitempty"`
	Key   string `json:"key,omitempty"`
}

type Plan struct {
	APIKey  []ApiKey `json:"api_key,omitempty"`
	Model   string   `json:"model,omitempty"`
	Label   string   `json:"label,omitempty"`
	BaseURL string   `json:"base_url,omitempty"`
}

type Config struct {
	Lang  string                `json:"lang"`
	Plans map[string]Plan       `json:"plans"`
	Tools map[string]Tool       `json:"tools,omitempty"`
}

type Model struct {
	ID          string   `json:"id"`
	ContextSize int      `json:"contextLength"`
	MaxTokens   int      `json:"maxTokens"`
	SupportAPIs []string `json:"support_apis"`
}
