import { useEffect, useState } from "react";
import { core, type Plan, type Tool } from "../core";
import { type Translator } from "../i18n";

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
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const plan = plans.find((item) => item.id === planId);
  useEffect(() => {
    setModel(plan?.model || "");
    setApiKey("");
    if (!planId) return;
    core
      .models(planId)
      .then((items) => setModels(items.map((item) => item.id)))
      .catch(() => setModels([]));
  }, [planId, plan?.model]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (apiKey || model !== plan?.model)
        await core.savePlan(planId, apiKey || undefined, model || undefined);
      if (tool) await core.applyTool(tool.name, planId);
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
                <select value={planId}
                  onChange={(event) => setPlanId(event.target.value)}
                  className="input"
                >
                  {plans.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name_zh} ({item.name})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={plan?.api_key_name || t("apiKey")}>
                <div className="relative">
                  <input value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    className="input"
                    placeholder={
                      plan?.apiKeyConfigured ? t("keepConfiguredKey") : t("enterApiKey")
                    }
                    type={showKey ? "text" : "password"}
                  />
                  <button type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-4 top-3 text-primary"
                  >
                    <span className="material-symbols-outlined">
                      {showKey ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
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
              {message && (
                <p className={
                    message === t("saved") ? "text-emerald-600" : "text-error"
                  }
                >
                  {message}
                </p>
              )}
              <div className="flex justify-end">
                <button disabled={busy}
                  type="submit"
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
