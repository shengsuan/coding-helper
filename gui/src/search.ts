import type { Plan, Tool } from "./core";

// 归一化查询词：忽略首尾空白并转为小写，实现大小写不敏感匹配。
function normalize(query: string): string {
  return query.trim().toLowerCase();
}

// matchesTool 判断工具是否命中查询词。
// 搜索字段：ID(name)、DisplayName(displayName)、Description(description)。
export function matchesTool(tool: Tool, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const haystack = [tool.name, tool.displayName, tool.description ?? ""]
    .join("\n")
    .toLowerCase();
  return haystack.includes(q);
}

// matchesPlan 判断套餐是否命中查询词。
// 搜索字段：key(id)、Label(label)、APIKey 的 Label(keys[].label)。
export function matchesPlan(plan: Plan, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const label = plan.label ?? plan.name_zh ?? plan.name ?? "";
  const keyLabels = plan.keys.map((k) => k.label).join("\n");
  const haystack = [plan.id, label, keyLabels].join("\n").toLowerCase();
  return haystack.includes(q);
}
