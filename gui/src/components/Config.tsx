import { useEffect, useState } from "react";
import { core, type Plan, type Tool } from "../core";
import { type Translator } from "../i18n";

const NEW_KEY = "__new__";

interface ConfigurationProps {
  tool: Tool | null;
  plans: Plan[];
  initialPlanId?: string;
  t: Translator;
  onBack: () => void;
  onSaved: () => void;
}

export default function Config({
  tool,
  plans,
  initialPlanId,
  t,
  onBack,
  onSaved,
}: ConfigurationProps) {
  const [planId, setPlanId] = useState(
    initialPlanId || tool?.configuredPlan || plans[0]?.id || "",
  );
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [keyLabel, setKeyLabel] = useState(tool?.configuredKey || "");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const plan = plans.find((item) => item.id === planId);
  useEffect(() => {
    setModel(plan?.model || "");
    if (!planId) return;
    core.models(planId)
      .then((items) => {
        setModels(items.map((item) => item.id))
      })
      .catch(() => setModels([]));
  }, [planId, plan?.model]);
  useEffect(() => {
    if (!tool || !plan) return;
    if (keyLabel === NEW_KEY) return;
    if (plan.keys?.some((item) => item.label === keyLabel)) return;
    setKeyLabel(plan.keys?.[0]?.label ?? NEW_KEY);
  }, [plan, keyLabel, tool]);
  const save = async (event: React.SubmitEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (model !== (plan?.model || ""))
        await core.savePlan(planId, undefined, model || undefined);
      if (tool) {
        let labelToApply = keyLabel;
        if (keyLabel === NEW_KEY) {
          if (!newKeyValue.trim()) throw new Error(t("keyValuePlaceholder"));
          labelToApply = newKeyLabel.trim();
          await core.addKey(planId, newKeyValue.trim(), labelToApply || undefined);
          setKeyLabel(labelToApply);
          setNewKeyLabel("");
          setNewKeyValue("");
        }
        await core.applyTool(tool.name, planId, labelToApply || undefined);
      }
      setMessage(t("saved"));
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <section className="mb-10 flex items-start gap-6 bg-surface-container-low p-8 rounded-xl">
        <button onClick={onBack}
          className="p-2 hover:bg-surface-container rounded-lg"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-3xl font-headline font-extrabold">
            {tool ? t("configureTool", { tool: tool.displayName })
              : t("configurePlanTitle")}
          </h2>
          <p className="text-on-surface-variant mt-2">
            {t("configDescription")}
          </p>
        </div>
      </section>
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8">
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
            <form className="space-y-7" onSubmit={save}>
              <Field label={t("servicePlan")}>
                <select value={planId} className="input"
                  onChange={(event) => setPlanId(event.target.value)}
                >
                  {plans.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name_zh} ({item.name})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("defaultModel")}>
                <input list="models" value={model} className="input"
                  onChange={(event) => setModel(event.target.value)}
                  placeholder={t("selectModel")}
                />
                <datalist id="models">
                  {models.map((item) => <option key={item} value={item} />)}
                </datalist>
              </Field>
              {tool && (
                <>
                  <Field label={t("keyToApply")}>
                    <select value={keyLabel} className="input"
                      onChange={(event) => setKeyLabel(event.target.value)}
                    >
                      <option value={NEW_KEY}>{t("createNewKey")}</option>
                      {plan?.keys?.map((item) => (
                        <option key={item.label} value={item.label}>
                          {item.label || t("defaultLabel")}
                          {tool?.configuredKey === item.label
                            ? ` (${t("currentlyUsed")})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {keyLabel === NEW_KEY && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label={t("keyLabelPlaceholder")}>
                        <input value={newKeyLabel} className="input"
                          onChange={(event) => setNewKeyLabel(event.target.value)}
                        />
                      </Field>
                      <Field label={t("keyValuePlaceholder")}>
                        <input value={newKeyValue} className="input"
                          onChange={(event) => setNewKeyValue(event.target.value)}
                        />
                      </Field>
                    </div>
                  )}
                </>
              )}
              {message && (
                <p className={
                    message === t("saved") ? "text-emerald-600" : "text-error"
                  }
                >
                  {message}
                </p>
              )}
              <div className="flex justify-end">
                <button disabled={busy} type="submit"
                  className="bg-primary text-white font-bold px-8 py-3 rounded-xl disabled:opacity-50"
                >
                  {busy ? t("saving") : tool ? t("saveAndApply") : t("saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
        <aside className="col-span-4">
          <div className="bg-surface-container-high p-6 rounded-xl">
            <h3 className="font-bold text-lg">{t("toolStatus")}</h3>
            {tool ? (
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  <span className="text-on-surface-variant">
                    {t("installed")}:{" "}
                  </span>
                  {tool.installed ? t("yes") : t("no")}
                </p>
                <p>
                  <span className="text-on-surface-variant">
                    {t("command")}:{" "}
                  </span>
                  {tool.command}
                </p>
                {tool.configuredKey && (
                  <p>
                    <span className="text-on-surface-variant">
                      {t("currentKey")}:{" "}
                    </span>
                    {tool.configuredKey || t("defaultLabel")}
                  </p>
                )}
                {!tool.installed && (
                  <p className="text-on-surface-variant">
                    {t("installBeforeApplyingAuto")}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-on-surface-variant">
                {t("choosePlan")}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-semibold text-on-surface-variant">
        {label}
      </span>
      {children}
    </label>
  );
}
