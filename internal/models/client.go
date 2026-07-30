package models

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/shengsuan/coding-helper/internal/config"
)

type Client struct{ HTTPClient *http.Client }

func NewClient(client *http.Client) *Client {
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	return &Client{HTTPClient: client}
}

func (c *Client) List(ctx context.Context, plan config.Plan, key string) ([]Model, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(plan.BaseURL, "/")+"/models", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	res, err := c.HTTPClient.Do(req)
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
	out := make([]Model, 0, len(payload.Data))
	for _, m := range payload.Data {
		out = append(out, Model{ID: m.APIName, ContextSize: m.Context, MaxTokens: m.Max, SupportAPIs: m.APIs})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, nil
}
