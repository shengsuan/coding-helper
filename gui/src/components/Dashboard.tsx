import { useState } from "react";
import { core, type Plan, type Tool } from "../core";
import { type Translator } from "../i18n";
import { matchesPlan, matchesTool } from "../search";
import { ProviderAvatar } from "./ui/provider-avatar";

interface DashboardProps {
  tools: Tool[];
  plans: Plan[];
  loading: boolean;
  t: Translator;
  filter?: string;
  onConfigureTool: (toolName: string) => void;
  onConfigurePlan: (planId: string) => void;
  onNavigateTools: () => void;
  onChanged: () => void;
}

export default function Dashboard({ tools, plans, loading, t, filter = "", onConfigureTool, onConfigurePlan, onNavigateTools, onChanged }: DashboardProps) {
  const [installing, setInstalling] = useState<string | null>(null);
  const q = filter.trim().toLowerCase();
  const visiblePlans = plans.filter((plan) => matchesPlan(plan, filter));
  const visibleTools = tools.filter((tool) => matchesTool(tool, filter));
  const configured = tools.filter((tool) => tool.configuredPlan).length;
  const keys = plans.filter((plan) => plan.apiKeyConfigured).length;
  const install = async (tool: Tool) => {
    setInstalling(tool.name);
    try {
      await core.installTool(tool.name);
      onChanged();
    } finally {
      setInstalling(null);
    }
  };
  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">
            {t("dashboardTitle")}
          </h2>
          <p className="text-on-surface-variant mt-2 font-medium">
            {t("dashboardDescription")}
          </p>
        </div>
        <button onClick={onNavigateTools}
          className="bg-primary text-white font-bold py-2.5 px-5 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">settings</span>
          {t("manageTools")}
        </button>
      </div>
      {q === "" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Stat icon="key" label={t("configuredApiKeys")} value={keys} />
          <Stat icon="terminal" label={t("installedTools")} value={tools.filter((tool) => tool.installed).length}/>
          <Stat icon="check_circle" label={t("appliedConfigurations")} value={configured}/>
        </div>
      )}
      {q !== "" && visiblePlans.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-primary text-xl">key</span>
            <h3 className="font-headline font-bold text-xl">{t("plans")}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
              {visiblePlans.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visiblePlans.map((plan) => (
              <div key={plan.id}
                className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10"
              >
                <div className="flex justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-headline font-bold text-lg">{plan.name_zh}</h3>
                    <p className="text-xs font-mono text-on-surface-variant mt-1">{plan.id}</p>
                  </div>
                  <span className={
                      plan.apiKeyConfigured
                        ? "text-emerald-600 font-semibold text-xs h-fit"
                        : "text-on-surface-variant font-semibold text-xs h-fit"
                    }
                  >
                    {plan.apiKeyConfigured ? t("configured") : t("notConfigured")}
                  </span>
                </div>
                <div className="space-y-2 mb-5 text-sm">
                  {plan.model && (
                    <div className="flex justify-between gap-2">
                      <span className="text-on-surface-variant">{t("defaultModel")}</span>
                      <span className="font-semibold">{plan.model}</span>
                    </div>
                  )}
                  {plan.keys.length > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-on-surface-variant shrink-0">{t("keyLabel")}</span>
                      <span className="font-semibold text-right min-w-0 break-all">
                        {plan.keys.map((k) => k.label || t("defaultLabel")).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={() => onConfigurePlan(plan.id)}
                  className="w-full font-bold py-2 rounded-lg bg-surface-container-low text-primary hover:bg-primary hover:text-white transition-all"
                >
                  {t("edit")}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {(q === "" || visibleTools.length > 0) && (
        <section>
          {q !== "" && (
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-primary text-xl">rocket_launch</span>
              <h3 className="font-headline font-bold text-xl">{t("tools")}</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                {visibleTools.length}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              <p className="text-on-surface-variant">{t("loading")}</p>
            ) : (
              visibleTools.map((tool) => {
            const plan = plans.find((item) => item.id === tool.configuredPlan);
            return (
              <div key={tool.name}
                className="bg-surface-container-lowest p-6 rounded-xl border border-transparent hover:border-primary-container/20 hover:shadow-[0_12px_40px_rgba(19,27,46,0.06)] transition-all duration-300 flex flex-col justify-between"
              >
                <div className="flex justify-between gap-3">
                  <ProviderAvatar provider={tool.name} />
                  {tool.installed ? (
                    <span className="text-xs font-semibold h-fit px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                      {t("installed")}
                    </span>
                  ) : (
                    <button onClick={() => install(tool)} disabled={installing === tool.name}
                      className="text-xs font-semibold h-fit px-2 py-1 rounded-full bg-surface-container text-on-surface-variant hover:bg-primary hover:text-white disabled:opacity-50"
                    >
                      {installing === tool.name ? t("installing") : t("installNow")}
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-headline font-bold text-lg mb-1">
                    {tool.displayName}
                  </h3>
                  <p className="text-sm text-on-surface-variant mb-5">
                    {tool.command}
                  </p>
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-on-surface-variant">
                        {t("configuration")}
                      </span>
                      <span className={plan? "font-semibold text-primary": "font-medium text-outline"}>
                        {plan?.name_zh || t("notConfigured")}
                      </span>
                    </div>
                    {plan && (
                      <div className="flex justify-between gap-2">
                        <span className="text-on-surface-variant">
                          {t("keyLabel")}
                        </span>
                        <span className="font-semibold">
                          {tool.configuredKey || t("notConfigured")}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="text-on-surface-variant">
                        {t("runtime")}
                      </span>
                      <span className="font-semibold">{tool.runtime}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => onConfigureTool(tool.name)}
                  className="w-full font-bold py-2.5 rounded-lg bg-surface-container-low text-primary hover:bg-primary hover:text-white transition-all"
                >
                  {plan ? t("changeConfiguration") : t("configure")}
                </button>
              </div>
            );
          })
        )}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: {icon: string;label: string;value: number }) {
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
