package app

import (
	"bufio"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"io"
	"math/rand"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"text/tabwriter"

	"github.com/99designs/keyring"
	"github.com/shengsuan/coding-helper/internal/models"
	"github.com/shengsuan/coding-helper/internal/tool"
)

// version 默认值仅用于未通过 -ldflags 注入版本号时的兜底（例如直接 go run）。
// 正式构建时会通过 Makefile 从项目根目录的 package.json 读取版本号，
// 并使用 `-ldflags "-X .../internal/app.version=vX.Y.Z"` 注入。
var version = "dev"

type Application struct {
	settings *Settings
	tools    *tool.Service
	in       *bufio.Reader
	out      io.Writer
	home     string
}

func Run(args []string, in io.Reader, out io.Writer) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	if resolved, err := filepath.EvalSymlinks(exe); err == nil {
		exe = resolved
	}
	configDir := filepath.Dir(exe)
	registry, err := DefaultTools(home)
	if err != nil {
		return err
	}
	s, err := NewSettings(configDir, registry)
	if err != nil {
		return fmt.Errorf("读取配置失败：%w", err)
	}
	resolver := models.ModelResolver{Client: models.NewClient(nil)}
	a := &Application{settings: s, tools: tool.NewService(registry, resolver), in: bufio.NewReader(in), out: out, home: home}
	return a.run(args)
}

func (a *Application) run(args []string) error {
	if len(args) == 0 {
		return a.overview()
	}
	switch args[0] {
	case "-h", "--help", "help":
		a.help()
		return nil
	case "-v", "--version", "version":
		fmt.Fprintln(a.out, version)
		return nil
	case "-s", "--show", "show":
		return a.show(args[1:])
	case "-c", "--cfg", "cfg":
		return a.cfg(args[1:])
	case "set":
		return a.set(args[1:])
	case "-a", "--auth", "auth":
		return a.auth(args[1:])
	case "gui":
		// Machine-readable bridge for the desktop GUI. Not listed in help
		// because end users should use the human CLI commands instead.
		return a.gui(args[1:])
	default:
		return fmt.Errorf("未知命令：%s", args[0])
	}
}

func (a *Application) help() {
	fmt.Fprint(a.out, `coding-helper 用于为 AI 编程工具配置胜算云凭证。

用法：
  coding-helper [command]

命令：
  (无参数)                              显示 Plan 列表、Tool 列表及帮助提示
  -h, --help, help                      显示帮助信息
  -v, --version, version                显示版本号
  -s, --show, show [plan|tool]          显示 Plan/Tool 列表；指定 plan 或 tool 时只显示对应列表
  -c, --cfg, cfg <子命令>                管理 config.json 中的 Plan（增/删/改/查）
      cfg [list]                        列出所有 Plan
      cfg show <plan>                   显示指定 Plan 详情
      cfg add <plan> --base-url URL [--label L] [--model M]
                                         新增 Plan（未指定 --label 时随机生成）
      cfg edit <plan> [--label L] [--base-url URL] [--model M]
                                         修改 Plan 字段
      cfg del <plan>                    删除 Plan
      cfg key add <plan> --key K [--label L]
                                         为 Plan 添加一个 API Key
      cfg key edit <plan> --key K [--new-key NK] [--label L]
                                         修改 Plan 中匹配 --key 的 API Key
      cfg key del <plan> --key K|--label L
                                         删除 Plan 中匹配的一个 API Key
  set <tool> <plan> [key_label]         将 Plan（及可选指定标签的 Key）写入工具自身配置文件
  set <tool> del                        清除工具自身配置文件中由本程序写入的字段
  set quick <tool> --base-url URL --api-key KEY [--label LABEL] [--model MODEL]
                                         为工具配置全新的 baseurl/apikey，并把新 Key 写回 Plan
  -a, --auth, auth [status]             显示配置文件加密状态
      auth set [password]               设置/启用自定义密码加密（不提供时交互式隐藏输入）
      auth change [password]            修改密码（用法同 set）
      auth delete                       删除密码，配置文件还原为明文
`)
}

func (a *Application) overview() error {
	fmt.Fprintln(a.out, "Coding Helper", version)
	a.printPlans()
	fmt.Fprintln(a.out)
	a.printTools()
	fmt.Fprintln(a.out)
	fmt.Fprintln(a.out, "使用 'coding-helper -h' 查看帮助。")
	return nil
}

func (a *Application) show(args []string) error {
	if len(args) == 0 {
		a.printPlans()
		fmt.Fprintln(a.out)
		a.printTools()
		return nil
	}
	switch args[0] {
	case "plan", "Plan", "plans", "Plans":
		a.printPlans()
	case "tool", "Tool", "tools", "Tools":
		a.printTools()
	default:
		return fmt.Errorf("用法：coding-helper show [plan|tool]")
	}
	return nil
}

func (a *Application) printPlans() {
	fmt.Fprintln(a.out, "Plans:")
	w := tabwriter.NewWriter(a.out, 0, 0, 2, ' ', 0)
	for _, id := range a.settings.PlanIDs() {
		p := a.settings.Plans()[id]
		fmt.Fprintf(w, "  %s\tlabel=%s\tbase_url=%s\tmodel=%s\tkeys=%d\n", id, p.Label, p.BaseURL, p.Model, len(p.APIKey))
	}
	w.Flush()
}

func (a *Application) printTools() {
	fmt.Fprintln(a.out, "Tools:")
	w := tabwriter.NewWriter(a.out, 0, 0, 2, ' ', 0)
	for _, id := range a.settings.ToolIDs() {
		t := a.settings.Tools()[id]
		state := "未安装"
		if a.tools.Installed(tool.ToolID(id)) {
			state = "已安装"
		}
		config := "未配置"
		if planID := a.settings.CurrentPlan(id); planID != "" {
			if p, ok := a.settings.GetPlan(planID); ok {
				label := a.settings.CurrentKeyLabel(id)
				if label == "" {
					label = firstKeyLabel(p)
				}
				if len(p.APIKey) > 0 {
					config = fmt.Sprintf("已配置: plan=%s key=%s", planID, labelOrNone(label))
				} else {
					config = fmt.Sprintf("已配置: plan=%s key=未配置", planID)
				}
			}
		}
		fmt.Fprintf(w, "  %s (%s)\t%s\t%s\n", id, t.DisplayName, state, config)
	}
	w.Flush()
}

func firstKeyLabel(p Plan) string {
	if len(p.APIKey) > 0 {
		return p.APIKey[0].Label
	}
	return ""
}

func labelOrNone(label string) string {
	if label == "" {
		return "(默认)"
	}
	return label
}

func (a *Application) cfg(args []string) error {
	if len(args) == 0 {
		return a.cfgList()
	}
	switch args[0] {
	case "list":
		return a.cfgList()
	case "show":
		if len(args) != 2 {
			return fmt.Errorf("用法：coding-helper cfg show <plan>")
		}
		return a.cfgShow(args[1])
	case "add":
		if len(args) < 2 {
			return fmt.Errorf("用法：coding-helper cfg add <plan> --base-url URL [--label L] [--model M]")
		}
		return a.cfgAdd(args[1], args[2:])
	case "edit":
		if len(args) < 2 {
			return fmt.Errorf("用法：coding-helper cfg edit <plan> [--label L] [--base-url URL] [--model M]")
		}
		return a.cfgEdit(args[1], args[2:])
	case "del":
		if len(args) != 2 {
			return fmt.Errorf("用法：coding-helper cfg del <plan>")
		}
		if err := a.settings.DeletePlan(args[1]); err != nil {
			return err
		}
		fmt.Fprintf(a.out, "✓ 已删除套餐：%s\n", args[1])
		return nil
	case "key":
		return a.cfgKey(args[1:])
	default:
		return fmt.Errorf("未知子命令：cfg %s", args[0])
	}
}

func (a *Application) cfgList() error {
	a.printPlans()
	return nil
}

func (a *Application) cfgShow(id string) error {
	p, ok := a.settings.GetPlan(id)
	if !ok {
		return fmt.Errorf("未知套餐：%s", id)
	}
	fmt.Fprintf(a.out, "%s\n  label: %s\n  base_url: %s\n  model: %s\n  keys:\n", id, p.Label, p.BaseURL, p.Model)
	for _, k := range p.APIKey {
		fmt.Fprintf(a.out, "    - label=%s key=%s\n", k.Label, maskKey(k.Key))
	}
	return nil
}

func (a *Application) cfgAdd(id string, args []string) error {
	flags, err := parseFlags(args)
	if err != nil {
		return err
	}
	if strings.TrimSpace(flags["base-url"]) == "" {
		return fmt.Errorf("必须提供 --base-url")
	}
	label := flags["label"]
	if strings.TrimSpace(label) == "" {
		label = randomLabel()
	}
	p := Plan{
		Label:   label,
		BaseURL: strings.TrimRight(flags["base-url"], "/"),
		Model:   flags["model"],
		APIKey:  []ApiKey{},
	}
	if err := a.settings.AddPlan(id, p); err != nil {
		return err
	}
	fmt.Fprintf(a.out, "✓ 已新增套餐：%s\n", id)
	return nil
}

func (a *Application) cfgEdit(id string, args []string) error {
	flags, err := parseFlags(args)
	if err != nil {
		return err
	}
	var label, baseURL, model *string
	if v, ok := flags["label"]; ok {
		label = &v
	}
	if v, ok := flags["base-url"]; ok {
		v = strings.TrimRight(v, "/")
		baseURL = &v
	}
	if v, ok := flags["model"]; ok {
		model = &v
	}
	if err := a.settings.EditPlan(id, label, baseURL, model); err != nil {
		return err
	}
	fmt.Fprintf(a.out, "✓ 已更新套餐：%s\n", id)
	return nil
}

func (a *Application) cfgKey(args []string) error {
	if len(args) < 2 {
		return fmt.Errorf("用法：coding-helper cfg key <add|edit|del> <plan> [flags]")
	}
	action, id := args[0], args[1]
	flags, err := parseFlags(args[2:])
	if err != nil {
		return err
	}
	switch action {
	case "add":
		key := flags["key"]
		if strings.TrimSpace(key) == "" {
			return fmt.Errorf("必须提供 --key")
		}
		if err := a.settings.AddKey(id, ApiKey{Key: key, Label: flags["label"]}); err != nil {
			return err
		}
		fmt.Fprintln(a.out, "✓ 已添加 API Key")
		return nil
	case "edit":
		key := flags["key"]
		if strings.TrimSpace(key) == "" {
			return fmt.Errorf("必须提供 --key")
		}
		var newKey, newLabel *string
		if v, ok := flags["new-key"]; ok {
			newKey = &v
		}
		if v, ok := flags["label"]; ok {
			newLabel = &v
		}
		if err := a.settings.EditKey(id, key, newKey, newLabel); err != nil {
			return err
		}
		fmt.Fprintln(a.out, "✓ 已更新 API Key")
		return nil
	case "del":
		if strings.TrimSpace(flags["key"]) == "" && strings.TrimSpace(flags["label"]) == "" {
			return fmt.Errorf("必须提供 --key 或 --label")
		}
		if err := a.settings.DeleteKey(id, flags["key"], flags["label"]); err != nil {
			return err
		}
		fmt.Fprintln(a.out, "✓ 已删除 API Key")
		return nil
	default:
		return fmt.Errorf("未知子命令：cfg key %s", action)
	}
}

func (a *Application) set(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("用法：coding-helper set <tool> <plan> [key_label] | set <tool> del | set quick <tool> --base-url URL --api-key KEY")
	}
	if args[0] == "quick" {
		if len(args) < 2 {
			return fmt.Errorf("用法：coding-helper set quick <tool> --base-url URL --api-key KEY [--label LABEL] [--model MODEL]")
		}
		return a.setQuick(args[1], args[2:])
	}
	if len(args) < 2 {
		return fmt.Errorf("用法：coding-helper set <tool> <plan> [key_label] | set <tool> del")
	}
	toolName := args[0]
	if args[1] == "del" {
		if err := a.tools.Clear(context.Background(), tool.ToolID(toolName)); err != nil {
			return err
		}
		if err := a.settings.ClearToolPlan(toolName); err != nil {
			return err
		}
		fmt.Fprintf(a.out, "✓ 已清除 %s 的配置\n", toolName)
		return nil
	}
	planID := args[1]
	keyLabel := ""
	if len(args) > 2 {
		keyLabel = args[2]
	}
	return a.applyPlan(toolName, planID, keyLabel, "")
}

func (a *Application) applyPlan(toolName, planID, keyLabel, preferredModel string) error {
	plan, ok := a.settings.GetPlan(planID)
	if !ok {
		return fmt.Errorf("未知套餐：%s", planID)
	}
	key, ok := a.settings.FindKey(planID, keyLabel)
	if !ok {
		if keyLabel == "" {
			return fmt.Errorf("套餐 %s 尚未配置 API 密钥", planID)
		}
		return fmt.Errorf("套餐 %s 中未找到标签为 %s 的 API 密钥", planID, keyLabel)
	}
	descriptor, ok := a.settings.Tools()[toolName]
	if !ok {
		return fmt.Errorf("未知工具：%s", toolName)
	}
	if !a.tools.Installed(tool.ToolID(toolName)) {
		fmt.Fprintf(a.out, "%s 尚未安装，正在执行：%s\n", descriptor.DisplayName, descriptor.InstallCommand)
		if err := a.tools.Install(context.Background(), tool.ToolID(toolName)); err != nil {
			return fmt.Errorf("安装 %s 失败：%w", descriptor.DisplayName, err)
		}
	}
	model := preferredModel
	if model == "" {
		model = plan.Model
	}
	fmt.Fprintf(a.out, "正在配置 %s…\n", descriptor.DisplayName)
	if err := a.tools.Apply(context.Background(), tool.ToolID(toolName), planID, plan, key.Key, model); err != nil {
		return err
	}
	if err := a.settings.SetToolPlan(toolName, planID, keyLabel); err != nil {
		return fmt.Errorf("已写入 %s 配置，但无法保存套餐映射：%w", descriptor.DisplayName, err)
	}
	fmt.Fprintf(a.out, "✓ 已将 %s 配置为使用 %s\n", descriptor.DisplayName, plan.Label)
	return nil
}

func (a *Application) setQuick(toolName string, args []string) error {
	flags, err := parseFlags(args)
	if err != nil {
		return err
	}
	baseURL := strings.TrimRight(strings.TrimSpace(flags["base-url"]), "/")
	apiKey := strings.TrimSpace(flags["api-key"])
	if baseURL == "" || apiKey == "" {
		return fmt.Errorf("必须提供 --base-url 和 --api-key")
	}
	label := flags["label"]
	model := flags["model"]

	planID := ""
	for id, p := range a.settings.Plans() {
		if strings.TrimRight(p.BaseURL, "/") == baseURL {
			planID = id
			break
		}
	}
	if planID != "" {
		if err := a.settings.AddKey(planID, ApiKey{Key: apiKey, Label: label}); err != nil {
			return err
		}
	} else {
		h := sha1.Sum([]byte(baseURL + ":" + apiKey))
		planID = "custom_" + hex.EncodeToString(h[:])[:16]
		planLabel := label
		if planLabel == "" {
			if model != "" {
				planLabel = "custom_" + shortModel(model)
			} else {
				planLabel = "custom_" + planID
			}
		}
		p := Plan{Label: planLabel, BaseURL: baseURL, Model: model, APIKey: []ApiKey{}}
		if err := a.settings.AddPlan(planID, p); err != nil {
			return err
		}
		if err := a.settings.AddKey(planID, ApiKey{Key: apiKey, Label: label}); err != nil {
			return err
		}
	}
	fmt.Fprintf(a.out, "✓ 已保存套餐：%s\n", planID)
	return a.applyPlan(toolName, planID, label, model)
}

func (a *Application) auth(args []string) error {
	if len(args) == 0 {
		args = []string{"status"}
	}
	switch args[0] {
	case "status":
		state := "未加密"
		if a.settings.IsEncrypted() {
			state = "已加密"
		}
		fmt.Fprintf(a.out, "加密状态：%s\n", state)
		return nil
	case "set", "change":
		password := ""
		if len(args) > 1 {
			password = args[1]
		} else {
			p1, err := keyring.TerminalPrompt("请输入新密码")
			if err != nil {
				return err
			}
			p2, err := keyring.TerminalPrompt("请再次输入新密码")
			if err != nil {
				return err
			}
			if p1 != p2 {
				return fmt.Errorf("两次输入的密码不一致")
			}
			password = p1
		}
		if strings.TrimSpace(password) == "" {
			return fmt.Errorf("密码不能为空")
		}
		if err := a.settings.SetPassword(password); err != nil {
			return err
		}
		fmt.Fprintln(a.out, "✓ 已设置密码")
		return nil
	case "delete", "del", "remove":
		if err := a.settings.RemovePassword(); err != nil {
			return err
		}
		fmt.Fprintln(a.out, "✓ 已删除密码，配置已还原为明文")
		return nil
	default:
		return fmt.Errorf("未知子命令：auth %s", args[0])
	}
}

var labelAdjectives = []string{"brave", "clever", "eager", "gentle", "happy", "jolly", "kind", "lively", "merry", "nice", "proud", "silly", "witty", "zealous", "wise"}
var labelNouns = []string{"panda", "tiger", "eagle", "dolphin", "fox", "wolf", "bear", "lion", "hawk", "owl", "deer", "rabbit", "shark", "whale", "lynx"}

func randomLabel() string {
	return labelAdjectives[rand.Intn(len(labelAdjectives))] + "_" + labelNouns[rand.Intn(len(labelNouns))]
}

func maskKey(key string) string {
	if len(key) > 6 {
		return key[:6] + "…"
	}
	if key == "" {
		return "未配置"
	}
	return key
}

func shortModel(v string) string {
	if p := strings.LastIndex(v, "/"); p >= 0 {
		return v[p+1:]
	}
	return v
}

func parseFlags(args []string) (map[string]string, error) {
	result := map[string]string{}
	for n := 0; n < len(args); n += 2 {
		if n+1 >= len(args) || !strings.HasPrefix(args[n], "-") {
			return nil, fmt.Errorf("参数格式错误：%v", args)
		}
		result[strings.TrimLeft(args[n], "-")] = args[n+1]
	}
	return result, nil
}

func commandExists(command string) bool { _, err := exec.LookPath(command); return err == nil }
func sortedKeys[T any](m map[string]T) []string {
	result := make([]string, 0, len(m))
	for key := range m {
		result = append(result, key)
	}
	sort.Strings(result)
	return result
}
