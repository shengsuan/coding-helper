package app

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/shengsuan/coding-helper/internal/tool"
)

// GuiRequest is the machine-readable request shape used by the desktop GUI.
// The CLI remains the single source of truth; the GUI shells out to:
//
//	coding-helper gui '<json>'
type GuiRequest struct {
	Action  string          `json:"action"`
	Payload json.RawMessage `json:"payload"`
}

type guiPlanView struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	NameZH           string `json:"name_zh"`
	BaseURL          string `json:"base_url,omitempty"`
	Model            string `json:"model,omitempty"`
	Label            string `json:"label,omitempty"`
	APIKeyName       string `json:"api_key_name,omitempty"`
	APIKeyConfigured bool   `json:"apiKeyConfigured"`
	Removable        bool   `json:"removable"`
}

type guiToolView struct {
	Name           string  `json:"name"`
	Command        string  `json:"command"`
	InstallCommand string  `json:"installCommand"`
	ConfigPath     string  `json:"configPath"`
	DisplayName    string  `json:"displayName"`
	Runtime        string  `json:"runtime"`
	Installed      bool    `json:"installed"`
	ConfiguredPlan *string `json:"configuredPlan"`
	ConfiguredKey  *string `json:"configuredKey"`
}

type guiOverview struct {
	Plans    []guiPlanView `json:"plans"`
	Tools    []guiToolView `json:"tools"`
	Language string        `json:"language"`
}

// gui handles the hidden JSON bridge used by the Tauri frontend.
// stdout always carries a single JSON object: {"ok":true,"result":...} or
// {"ok":false,"error":"..."}. This keeps the GUI and CLI on one binary so users
// do not need a second download of the core logic.
func (a *Application) gui(args []string) error {
	if len(args) == 0 {
		return a.writeGuiError(fmt.Errorf("用法：coding-helper gui '<json>'"))
	}
	var req GuiRequest
	if err := json.Unmarshal([]byte(args[0]), &req); err != nil {
		return a.writeGuiError(fmt.Errorf("无效的 GUI 请求：%w", err))
	}
	result, err := a.dispatchGui(req)
	if err != nil {
		return a.writeGuiError(err)
	}
	return a.writeGuiOK(result)
}

func (a *Application) dispatchGui(req GuiRequest) (any, error) {
	payload := map[string]any{}
	if len(req.Payload) > 0 && string(req.Payload) != "null" {
		if err := json.Unmarshal(req.Payload, &payload); err != nil {
			return nil, fmt.Errorf("无效的 payload：%w", err)
		}
	}
	switch req.Action {
	case "overview":
		return a.guiOverview(), nil
	case "models":
		return a.guiModels(str(payload["planId"]))
	case "set-language":
		return a.guiSetLanguage(str(payload["language"]))
	case "save-plan":
		return a.guiSavePlan(str(payload["planId"]), optionalStr(payload["apiKey"]), optionalStr(payload["model"]), optionalStr(payload["label"]))
	case "revoke-plan":
		return a.guiRevokePlan(str(payload["planId"]))
	case "add-plan":
		return a.guiAddPlan(str(payload["label"]), str(payload["baseUrl"]), str(payload["model"]))
	case "delete-plan":
		return a.guiDeletePlan(str(payload["planId"]))
	case "apply-tool":
		return a.guiApplyTool(str(payload["toolName"]), str(payload["planId"]))
	case "remove-tool-config":
		return a.guiRemoveToolConfig(str(payload["toolName"]))
	default:
		return nil, fmt.Errorf("未知 GUI 操作：%s", req.Action)
	}
}

func (a *Application) guiOverview() guiOverview {
	return guiOverview{
		Plans:    a.guiPlans(),
		Tools:    a.guiTools(),
		Language: a.settings.Lang(),
	}
}

func (a *Application) guiPlans() []guiPlanView {
	ids := a.settings.PlanIDs()
	out := make([]guiPlanView, 0, len(ids))
	for _, id := range ids {
		p, _ := a.settings.GetPlan(id)
		out = append(out, toGuiPlan(id, p))
	}
	return out
}

func (a *Application) guiTools() []guiToolView {
	ids := a.settings.ToolIDs()
	out := make([]guiToolView, 0, len(ids))
	for _, id := range ids {
		t := a.settings.Tools()[id]
		var plan *string
		if current := a.settings.CurrentPlan(id); current != "" {
			plan = &current
		}
		var keyLabel *string
		if current := a.settings.CurrentKeyLabel(id); current != "" {
			keyLabel = &current
		}
		out = append(out, guiToolView{
			Name:           t.Name,
			Command:        t.Command,
			InstallCommand: t.InstallCommand,
			ConfigPath:     t.ConfigPath,
			DisplayName:    t.DisplayName,
			Runtime:        t.Runtime,
			Installed:      a.tools.Installed(tool.ToolID(id)),
			ConfiguredPlan: plan,
			ConfiguredKey:  keyLabel,
		})
	}
	return out
}

func (a *Application) guiModels(planID string) ([]map[string]string, error) {
	plan, ok := a.settings.GetPlan(planID)
	if !ok {
		return nil, fmt.Errorf("未知套餐：%s", planID)
	}
	key, ok := a.settings.FindKey(planID, "")
	if !ok {
		return nil, fmt.Errorf("套餐 %s 尚未配置 API 密钥", planID)
	}
	models, err := GetModels(plan, key.Key)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]string, 0, len(models))
	for _, m := range models {
		out = append(out, map[string]string{"id": m.ID})
	}
	return out, nil
}

func (a *Application) guiSetLanguage(language string) (string, error) {
	if language != "zh_CN" && language != "en_US" {
		return "", fmt.Errorf("不支持的语言：%s", language)
	}
	if err := a.settings.SetLang(language); err != nil {
		return "", err
	}
	return a.settings.Lang(), nil
}

func (a *Application) guiSavePlan(planID string, apiKey, model, label *string) (guiPlanView, error) {
	if _, ok := a.settings.GetPlan(planID); !ok {
		return guiPlanView{}, fmt.Errorf("未知套餐：%s", planID)
	}
	if apiKey != nil {
		trimmed := strings.TrimSpace(*apiKey)
		if trimmed == "" {
			return guiPlanView{}, fmt.Errorf("API 密钥不能为空")
		}
		if err := a.settings.UpsertPrimaryKey(planID, trimmed); err != nil {
			return guiPlanView{}, err
		}
	}
	if model != nil || label != nil {
		if err := a.settings.EditPlan(planID, label, nil, model); err != nil {
			return guiPlanView{}, err
		}
	}
	p, _ := a.settings.GetPlan(planID)
	return toGuiPlan(planID, p), nil
}

func (a *Application) guiRevokePlan(planID string) (guiPlanView, error) {
	if err := a.settings.ClearKeys(planID); err != nil {
		return guiPlanView{}, err
	}
	p, _ := a.settings.GetPlan(planID)
	return toGuiPlan(planID, p), nil
}

func (a *Application) guiAddPlan(label, baseURL, model string) (guiPlanView, error) {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		return guiPlanView{}, fmt.Errorf("必须提供服务地址")
	}
	label = strings.TrimSpace(label)
	if label == "" {
		label = randomLabel()
	}
	id := a.uniquePlanID(label)
	p := Plan{Label: label, BaseURL: baseURL, Model: strings.TrimSpace(model), APIKey: []ApiKey{}}
	if err := a.settings.AddPlan(id, p); err != nil {
		return guiPlanView{}, err
	}
	return toGuiPlan(id, p), nil
}

func (a *Application) guiDeletePlan(planID string) (string, error) {
	if isDefaultPlan(planID) {
		return "", fmt.Errorf("默认套餐不可删除，可编辑或撤销其 API 密钥")
	}
	if err := a.settings.DeletePlan(planID); err != nil {
		return "", err
	}
	return planID, nil
}

// uniquePlanID slugifies label into an ASCII plan ID and appends a numeric
// suffix on collision. It falls back to "plan" when label has no ASCII
// letters or digits (e.g. an entirely Chinese label).
func (a *Application) uniquePlanID(label string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(label) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == ' ' || r == '-' || r == '_':
			b.WriteByte('_')
		}
	}
	base := strings.Trim(b.String(), "_")
	if base == "" {
		base = "plan"
	}
	id := base
	for n := 2; ; n++ {
		if _, ok := a.settings.GetPlan(id); !ok {
			return id
		}
		id = fmt.Sprintf("%s_%d", base, n)
	}
}

func isDefaultPlan(id string) bool {
	_, ok := DefaultPlans()[id]
	return ok
}

func (a *Application) guiApplyTool(toolName, planID string) (guiToolView, error) {
	// applyPlan already validates the tool/plan/key and installs the tool
	// automatically when missing; the GUI reuses that path verbatim so
	// behavior matches the `set <tool> <plan>` CLI command exactly.
	prev := a.out
	a.out = io.Discard
	err := a.applyPlan(toolName, planID, "", "")
	a.out = prev
	if err != nil {
		return guiToolView{}, err
	}
	for _, t := range a.guiTools() {
		if t.Name == toolName {
			return t, nil
		}
	}
	return guiToolView{}, fmt.Errorf("应用成功但无法读取工具状态：%s", toolName)
}

func (a *Application) guiRemoveToolConfig(toolName string) (guiToolView, error) {
	if _, ok := a.settings.Tools()[toolName]; !ok {
		return guiToolView{}, fmt.Errorf("未知工具：%s", toolName)
	}
	if err := a.tools.Clear(context.Background(), tool.ToolID(toolName)); err != nil {
		return guiToolView{}, err
	}
	if err := a.settings.ClearToolPlan(toolName); err != nil {
		return guiToolView{}, err
	}
	for _, t := range a.guiTools() {
		if t.Name == toolName {
			return t, nil
		}
	}
	return guiToolView{}, fmt.Errorf("清除成功但无法读取工具状态：%s", toolName)
}

func toGuiPlan(id string, p Plan) guiPlanView {
	name := p.Label
	if name == "" {
		name = id
	}
	nameZH := p.Label
	if nameZH == "" {
		nameZH = id
	}
	return guiPlanView{
		ID:               id,
		Name:             name,
		NameZH:           nameZH,
		BaseURL:          p.BaseURL,
		Model:            p.Model,
		Label:            p.Label,
		APIKeyName:       "API Key",
		APIKeyConfigured: len(p.APIKey) > 0,
		Removable:        !isDefaultPlan(id),
	}
}

func (a *Application) writeGuiOK(result any) error {
	return a.writeGui(map[string]any{"ok": true, "result": result})
}

func (a *Application) writeGuiError(err error) error {
	_ = a.writeGui(map[string]any{"ok": false, "error": err.Error()})
	// Return nil so the process exits 0: the GUI parses the JSON envelope.
	// Fatal startup errors still go through the normal stderr path.
	return nil
}

func (a *Application) writeGui(v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	_, err = a.out.Write(append(b, '\n'))
	return err
}

func str(v any) string {
	if v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	default:
		return fmt.Sprint(t)
	}
}

func optionalStr(v any) *string {
	if v == nil {
		return nil
	}
	s, ok := v.(string)
	if !ok {
		return nil
	}
	return &s
}
