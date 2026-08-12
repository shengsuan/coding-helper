# Config.tsx: full API key management + key selection for apply

## Context

The GUI's Config page (`gui/src/components/Config.tsx`) currently only lets a user
type one API key that overwrites the plan's *first* key (`core.savePlan` →
`guiSavePlan` → `Settings.UpsertPrimaryKey`). The CLI already supports a full
list of labeled keys per plan (`cfg key add/edit/del`), but the GUI never
exposes that: users can't see which keys exist, can't add a second key, and
can't pick which key gets written into a tool's config file when applying.

This task brings the GUI up to parity with the CLI for key management, and
confirms/tightens the existing default-model input (it already fetches model
options from the same `GetModels` used by the CLI, via `core.models(planId)` →
`guiModels` → `internal/app/models.go:GetModels`).

Per user decision:
- Support view + add + **delete** of individual keys (not just upsert-first).
- When applying a plan to a tool, let the user **choose which key label** to
  write, instead of silently using the default/first key.

## Backend changes — `internal/app/gui.go`

1. Add a `guiKeyView` struct and a `Keys []guiKeyView` field on `guiPlanView`:
   ```go
   type guiKeyView struct {
       Label string `json:"label"`
       Key   string `json:"key"`
   }
   ```
   Populate it in `toGuiPlan` from `p.APIKey`. Keep `APIKeyConfigured` as-is
   (still `len(p.APIKey) > 0`) since `ApiKeys.tsx` depends on it.

2. New dispatch actions in `dispatchGui`:
   - `"add-key"` → `guiAddKey(planId, key, label)` — validates key is
     non-empty, calls `a.settings.AddKey(planID, ApiKey{Key, Label})`, returns
     the updated `guiPlanView`.
   - `"delete-key"` → `guiDeleteKey(planId, key, label)` — requires at least
     one of key/label, calls `a.settings.DeleteKey(planID, key, label)`
     (already supports matching by either), returns updated `guiPlanView`.

3. `guiApplyTool` gains a `keyLabel string` parameter and forwards it to
   `a.applyPlan(toolName, planID, keyLabel, "")` (this already threads through
   to `Settings.FindKey` and `Settings.SetToolPlan` — no change needed there).
   Update the `"apply-tool"` dispatch case to read `payload["keyLabel"]`.

No changes needed in `internal/app/settings.go` — `AddKey`, `DeleteKey`,
`FindKey` already do exactly what's needed.

## Frontend changes — `gui/src/core.ts`

- `Plan` interface: add `keys: Array<{ label: string; key: string }>`.
- `applyTool(toolName, planId, keyLabel?)` — add optional third arg, forwarded
  as `keyLabel` in the payload.
- New: `addKey(planId, key, label?) => action<Plan>('add-key', { planId, key, label })`
- New: `deleteKey(planId, key?, label?) => action<Plan>('delete-key', { planId, key, label })`

## Frontend changes — `gui/src/components/Config.tsx`

Replace the single "API key" text field with:

1. **Key list** — render `plan.keys`. Each row: label (or "(默认)" if blank),
   masked key by default with a per-row reveal toggle (mirrors the existing
   show/hide pattern already in this file), and a delete button that confirms
   via `window.confirm` (same pattern as `ApiKeys.tsx`'s `deletePlan`) then
   calls `core.deleteKey` and triggers a refresh.
2. **Add key form** — small inline form (label optional, key required) below
   the list; on submit calls `core.addKey`, clears the inputs, triggers a
   refresh. Reuses `Field` helper already in this file.
3. **Apply-to-tool key selector** — only rendered when `tool` is set (i.e. not
   the plan-only editing flow from `ApiKeys.tsx`). A `<select>` of
   `plan.keys` labels, defaulting to `tool.configuredKey` or the first key's
   label, stored in a new `keyLabel` state. Passed through on submit as
   `core.applyTool(tool.name, planId, keyLabel)`.
4. Drop the old single `apiKey` state/field and the now-unwired call to
   `core.savePlan(planId, apiKey, ...)` for the key part — `savePlan` on
   submit now only carries model changes. Keys are managed immediately by the
   list/add-form above, not deferred to the main "save" button.
5. Refresh wiring: reuse the existing `onSaved` prop (already
   `() => void refresh()` in `App.tsx`) after every add/delete-key call, so
   `plan.keys` re-renders from the refreshed `overview.plans` without needing
   any new prop.
6. Default model input: keep the existing `<input list="models">` +
   `<datalist>` bound to `core.models(planId)` — this already satisfies
   "type or pick from a dropdown, sourced from `GetModels`". No functional
   change planned here beyond whatever incidental JSX shifts come from
   removing the old apiKey field.

## i18n — `gui/src/i18n.ts`

Add zh_CN/en_US pairs for: key list section title, "no keys yet", add-key
form labels/button, delete-key confirm text, reveal/hide toggle (can reuse
existing pattern), "key used to apply" selector label. Remove/repurpose the
now-unused `keepConfiguredKey`/`enterApiKey` if nothing references them after
the rewrite (repurpose `apiKey` as the section header, it's still relevant).

## Verification

- `go build ./...` for the backend.
- Smoke-test the JSON bridge directly (headless, no display needed):
  ```
  go run ./cmd/coding-helper gui '{"action":"add-key","payload":{"planId":"pay_as_you_go","key":"test123","label":"t1"}}'
  go run ./cmd/coding-helper gui '{"action":"delete-key","payload":{"planId":"pay_as_you_go","label":"t1"}}'
  go run ./cmd/coding-helper gui '{"action":"apply-tool","payload":{"toolName":"grok","planId":"pay_as_you_go","keyLabel":"t1"}}'
  ```
- `cd gui && npm run build` (runs `tsc` then `vite build`) to type-check the
  new React code — this is a Tauri desktop app, so I cannot launch and click
  through the actual UI in this headless environment; I'll say so explicitly
  rather than claim manual UI verification.
