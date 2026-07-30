package models

type Model struct {
	ID          string   `json:"id"`
	ContextSize int      `json:"contextLength"`
	MaxTokens   int      `json:"maxTokens"`
	SupportAPIs []string `json:"support_apis"`
}

type Protocol string

const (
	ProtocolOpenAIChat      Protocol = "openai-chat"
	ProtocolOpenAIResponses Protocol = "openai-responses"
	ProtocolAnthropic       Protocol = "anthropic-messages"
)

func (p Protocol) Endpoint() string {
	switch p {
	case ProtocolOpenAIResponses:
		return "/v1/responses"
	case ProtocolAnthropic:
		return "/v1/messages"
	default:
		return "/v1/chat/completions"
	}
}
