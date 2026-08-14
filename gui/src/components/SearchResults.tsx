import { useState } from "react";
import { core, type Plan, type Tool } from "../core";
import { type Translator } from "../i18n";
import { matchesPlan, matchesTool } from "../search";
import { ProviderAvatar } from "./ui/provider-avatar";

interface SearchResultsProps {
  query: string;
  scope: "all" | "tools" | "plans";
  tools: Tool[];
  plans: Plan[];
  t: Translator;
  onConfigureTool: (toolName: string) => void;
  onConfigurePlan: (planId: string) => void;
  onNavigateTools: () => void;
  onNavigateApiKeys: () => void;
  onChanged: () => void;
}

export default function SearchResults({
  query,
  scope,
  tools,
  plans,
  t,
  onConfigureTool,
  onConfigurePlan,
  onNavigateTools,
  onNavigateApiKeys,
  onChanged,
}: SearchResultsProps) {
  const [installing, setInstalling] = useState<string | null>(null);
  const showTools = scope !== "plans";
  const showPlans = scope !== "tools";

  const matchedTools = showTools ? tools.filter((tool) => matchesTool(tool, query)) : [];
  const matchedPlans = showPlans ? plans.filter((plan) => matchesPlan(plan, query)) : [];
  const total = matchedTools.length + matchedPlans.length;

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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">
          {t("searchResults")}
        </h2>
        <p className="text-on-surface-variant mt-2 font-medium">
          {t("searchResultsDescription", { query, count: String(total) })}
        </p>
      </div>

      {total === 0 ? (
        <div className="py-20 text-center">
          <span className="material-symbols-outlined text-5xl text-outline">
            search_off
          </span>
          <p className="mt-4 text-on-surface-variant font-medium">{t("noMatches")}</p>
        </div>
      ) : (
        <div className="space-y-10">
          {matchedTools.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-primary text-xl">
                  rocket_launch
                </span>
                <h3 className="font-headline font-bold text-xl">{t("tools")}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                  {matchedTools.length}
                </span>
                {scope === "all" && (
                  <button onClick={onNavigateTools}
                    className="ml-auto text-sm font-semibold text-primary hover:underline"
                  >
                    {t("viewAllTools")}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {matchedTools.map((tool) => (
                  <ToolCard key={tool.name} tool={tool} t={t}
                    installing={installing === tool.name}
                    onInstall={() => install(tool)}
                    onConfigure={() => onConfigureTool(tool.name)}
                  />
                ))}
              </div>
            </section>
          )}

          {matchedPlans.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-primary text-xl">key</span>
                <h3 className="font-headline font-bold text-xl">{t("plans")}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                  {matchedPlans.length}
                </span>
                {scope === "all" && (
                  <button onClick={onNavigateApiKeys}
                    className="ml-auto text-sm font-semibold text-primary hover:underline"
                  >
                    {t("viewAllPlans")}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matchedPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} t={t}
                    onConfigure={() => onConfigurePlan(plan.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool, t, installing, onInstall, onConfigure }: {
  tool: Tool;
  t: Translator;
  installing: boolean;
  onInstall: () => void;
  onConfigure: () => void;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl border border-transparent hover:border-primary-container/20 hover:shadow-[0_12px_40px_rgba(19,27,46,0.06)] transition-all duration-300 flex flex-col justify-between">
      <div className="flex justify-between gap-3">
        <ProviderAvatar provider={tool.name} />
        {tool.installed ? (
          <span className="text-xs font-semibold h-fit px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
            {t("installed")}
          </span>
        ) : (
          <button onClick={onInstall} disabled={installing}
            className="text-xs font-semibold h-fit px-2 py-1 rounded-full bg-surface-container text-on-surface-variant hover:bg-primary hover:text-white disabled:opacity-50"
          >
            {installing ? t("installing") : t("installNow")}
          </button>
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-headline font-bold text-lg mb-1">{tool.displayName}</h3>
        <p className="text-xs font-mono text-on-surface-variant mb-3">{tool.name}</p>
        {tool.description && (
          <p className="text-sm text-on-surface-variant mb-5 line-clamp-3">{tool.description}</p>
        )}
      </div>
      <button onClick={onConfigure}
        className="w-full font-bold py-2.5 rounded-lg bg-surface-container-low text-primary hover:bg-primary hover:text-white transition-all"
      >
        {tool.configuredPlan ? t("changeConfiguration") : t("configure")}
      </button>
    </div>
  );
}

function PlanCard({ plan, t, onConfigure }: {
  plan: Plan;
  t: Translator;
  onConfigure: () => void;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col">
      <div className="flex justify-between gap-3 mb-4">
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
      <div className="space-y-2 mb-6 text-sm flex-1">
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
        {plan.base_url && (
          <div className="text-xs font-mono text-on-surface-variant break-all pt-1">
            {plan.base_url}
          </div>
        )}
      </div>
      <button onClick={onConfigure}
        className="w-full font-bold py-2.5 rounded-lg bg-surface-container-low text-primary hover:bg-primary hover:text-white transition-all"
      >
        {t("edit")}
      </button>
    </div>
  );
}

