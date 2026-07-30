import { useState } from "react";
import { core, type Plan, type Tool } from "../core";
import { type Translator } from "../i18n";

interface ToolsProps {
  tools: Tool[];
  plans: Plan[];
  t: Translator;
  onChanged: () => void;
  onConfigure: (name: string) => void;
}

export default function Tools({
  tools,
  plans,
  t,
  onChanged,
  onConfigure,
}: ToolsProps) {
  const [message, setMessage] = useState("");
  const remove = async (tool: Tool) => {
    try {
      await core.removeToolConfig(tool.name);
      setMessage(t("configurationRemoved", { tool: tool.displayName }));
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h2 className="text-4xl font-headline font-extrabold">
          {t("supportedTools")}
        </h2>
        <p className="text-on-surface-variant mt-2">{t("toolsDescription")}</p>
      </div>
      {message && <p className="mb-5 text-on-surface-variant">{message}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tools.map((tool) => {
          const plan = plans.find((item) => item.id === tool.configuredPlan);
          return (
            <div
              key={tool.name}
              className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10"
            >
              <div className="flex justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">{tool.displayName}</h3>
                  <p className="font-mono text-sm text-on-surface-variant mt-1">
                    {tool.command}
                  </p>
                </div>
                <span
                  className={
                    tool.installed
                      ? "text-emerald-600 font-semibold text-sm"
                      : "text-tertiary font-semibold text-sm"
                  }
                >
                  {tool.installed ? t("installed") : t("notInstalled")}
                </span>
              </div>
              <div className="mt-6 text-sm space-y-2">
                <p>
                  <span className="text-on-surface-variant">{t("plan")}: </span>
                  {plan?.name_zh || t("notApplied")}
                </p>
                <p>
                  <span className="text-on-surface-variant">
                    {t("config")}:{" "}
                  </span>
                  <code className="break-all">{tool.configPath}</code>
                </p>
                {!tool.installed && (
                  <p className="bg-surface-container-low p-3 rounded-lg font-mono text-xs">
                    {tool.installCommand}
                  </p>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => onConfigure(tool.name)}
                  className="bg-primary text-white font-bold px-4 py-2 rounded-lg"
                >
                  {t("configure")}
                </button>
                {tool.configuredPlan && (
                  <button
                    onClick={() => remove(tool)}
                    className="text-tertiary font-bold px-4 py-2"
                  >
                    {t("removeConfiguration")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
