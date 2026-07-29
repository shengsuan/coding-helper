package app

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"
)

func GetModels(plan Plan, key string) ([]Model, error) {
	req, err := http.NewRequest(http.MethodGet, strings.TrimRight(plan.BaseURL, "/")+"/models", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	client := &http.Client{Timeout: 15 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("模型接口返回状态：%s", res.Status)
	}
	var payload struct {
		Data []struct {
			APIName string   `json:"api_name"`
			Context int      `json:"context_window"`
			Max     int      `json:"max_tokens"`
			APIs    []string `json:"support_apis"`
		} `json:"data"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, err
	}
	models := make([]Model, 0, len(payload.Data))
	for _, m := range payload.Data {
		models = append(models, Model{ID: m.APIName, ContextSize: m.Context, MaxTokens: m.Max, SupportAPIs: m.APIs})
	}
	sort.Slice(models, func(i, j int) bool { return models[i].ID < models[j].ID })
	return models, nil
}

func ValidateModel(models []Model, selected, endpoint string) (string, error) {
	for _, m := range models {
		if m.ID == selected && supports(m, endpoint) {
			return selected, nil
		}
	}
	if selected != "" {
		return "", fmt.Errorf("模型 %s 不支持 %s", selected, endpoint)
	}
	for _, m := range models {
		if supports(m, endpoint) {
			return m.ID, nil
		}
	}
	return "", fmt.Errorf("没有模型支持 %s", endpoint)
}

func supports(m Model, endpoint string) bool {
	for _, api := range m.SupportAPIs {
		if api == endpoint {
			return true
		}
	}
	return false
}
