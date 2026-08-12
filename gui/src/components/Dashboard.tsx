import { type Plan, type Tool } from "../core";
import { type Translator } from "../i18n";

interface DashboardProps {
  tools: Tool[];
  plans: Plan[];
  loading: boolean;
  t: Translator;
  onConfigureTool: (toolName: string) => void;
  onNavigateTools: () => void;
}

export default function Dashboard({ tools, plans, loading, t, onConfigureTool, onNavigateTools }: DashboardProps) {
  const configured = tools.filter((tool) => tool.configuredPlan).length;
  const keys = plans.filter((plan) => plan.apiKeyConfigured).length;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Stat icon="key" label={t("configuredApiKeys")} value={keys} />
        <Stat icon="terminal" label={t("installedTools")} value={tools.filter((tool) => tool.installed).length}/>
        <Stat icon="check_circle" label={t("appliedConfigurations")} value={configured}/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <p className="text-on-surface-variant">{t("loading")}</p>
        ) : (
          tools.map((tool) => {
            const plan = plans.find((item) => item.id === tool.configuredPlan);
            return (
              <div key={tool.name}
                className="bg-surface-container-lowest p-6 rounded-xl border border-transparent hover:border-primary-container/20 hover:shadow-[0_12px_40px_rgba(19,27,46,0.06)] transition-all duration-300"
              >
                <div className="flex justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-primary">
                      terminal
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold h-fit px-2 py-1 rounded-full ${tool.installed ? "bg-emerald-50 text-emerald-600" : "bg-surface-container text-on-surface-variant"}`}
                  >
                    {tool.installed ? t("installed") : t("notInstalled")}
                  </span>
                </div>
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
