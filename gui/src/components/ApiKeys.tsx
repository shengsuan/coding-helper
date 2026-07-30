import { useState } from "react";
import { type Plan } from "../core";
import { type Translator } from "../i18n";

interface ApiKeysProps {
  plans: Plan[];
  t: Translator;
  onEdit: (planId: string) => void;
  onRevoke: (planId: string) => void;
  onAdd: (label: string, baseUrl: string, model: string) => Promise<void>;
  onDelete: (planId: string) => void;
}

export default function ApiKeys({ plans, t, onEdit, onRevoke, onAdd, onDelete }: ApiKeysProps) {
  const configured = plans.filter((plan) => plan.apiKeyConfigured);
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const createPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onAdd(label, baseUrl, model);
      setShowAdd(false);
      setLabel("");
      setBaseUrl("");
      setModel("");
    } finally {
      setBusy(false);
    }
  };
  const deletePlan = (plan: Plan) => {
    if (window.confirm(t("confirmDeletePlan", { plan: plan.name_zh }))) onDelete(plan.id);
  };
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end gap-6 mb-10">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">
            {t("apiCredentials")}
          </h2>
          <p className="text-on-surface-variant mt-2">
            {t("credentialsDescription")}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {t("addPlan")}
        </button>
      </div>
      {showAdd && (
        <form onSubmit={createPlan}
          className="mb-10 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 p-6 grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <label className="block space-y-2">
            <span className="block text-sm font-semibold text-on-surface-variant">
              {t("planName")}
            </span>
            <input value={label} onChange={(event) => setLabel(event.target.value)} className="input" />
          </label>
          <label className="block space-y-2 md:col-span-2">
            <span className="block text-sm font-semibold text-on-surface-variant">
              {t("baseUrlLabel")}
            </span>
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="input" required />
          </label>
          <label className="block space-y-2">
            <span className="block text-sm font-semibold text-on-surface-variant">
              {t("modelOptional")}
            </span>
            <input value={model} onChange={(event) => setModel(event.target.value)} className="input" />
          </label>
          <div className="md:col-span-4 flex justify-end gap-3">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 font-bold text-on-surface-variant">
              {t("cancel")}
            </button>
            <button type="submit" disabled={busy} className="bg-primary text-white font-bold px-6 py-2 rounded-xl disabled:opacity-50">
              {t("createPlan")}
            </button>
          </div>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Stat icon="key" label={t("configuredPlans")} value={configured.length}/>
        <Stat icon="neurology" label={t("availablePlans")} value={plans.length}/>
        <Stat icon="apps" label={t("toolsUsingPlan")} value={t("sharedWithCli")}/>
      </div>
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low/30">
              <Head>{t("plan")}</Head>
              <Head>{t("status")}</Head>
              <Head>{t("defaultModel")}</Head>
              <Head>{t("endpoint")}</Head>
              <Head>{t("actions")}</Head>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {plans.map((plan) => (
              <tr key={plan.id}
                className="hover:bg-surface-container-highest/30"
              >
                <td className="px-8 py-5">
                  <p className="font-bold">{plan.name_zh}</p>
                  <p className="text-xs text-on-surface-variant">{plan.name}</p>
                </td>
                <td className="px-8 py-5">
                  <span className={
                      plan.apiKeyConfigured
                        ? "text-emerald-600 font-semibold text-xs"
                        : "text-on-surface-variant font-semibold text-xs"
                    }
                  >
                    {plan.apiKeyConfigured? t("configured"): t("notConfigured")}
                  </span>
                </td>
                <td className="px-8 py-5 text-sm">
                  {plan.model || t("notSelected")}
                </td>
                <td className="px-8 py-5 text-xs font-mono text-on-surface-variant">
                  {plan.base_url || "—"}
                </td>
                <td className="px-8 py-5">
                  <div className="flex gap-3">
                    <button onClick={() => onEdit(plan.id)}
                      className="text-primary font-bold text-sm"
                    >
                      {t("edit")}
                    </button>
                    {plan.apiKeyConfigured && (
                      <button onClick={() => onRevoke(plan.id)}
                        className="text-tertiary font-bold text-sm"
                      >
                        {t("revoke")}
                      </button>
                    )}
                    {plan.removable && (
                      <button onClick={() => deletePlan(plan)}
                        className="text-error font-bold text-sm"
                      >
                        {t("deletePlan")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <p className="text-sm font-medium text-on-surface-variant mt-4">
        {label}
      </p>
      <p className="text-3xl font-headline font-extrabold mt-1">{value}</p>
    </div>
  );
}
function Head({ children }: { children: string }) {
  return (
    <th className="px-8 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
      {children}
    </th>
  );
}
