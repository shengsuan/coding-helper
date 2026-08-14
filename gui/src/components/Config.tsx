import { useEffect, useRef, useState } from "react";
import { core, type Plan, type Tool } from "../core";
import { type Translator } from "../i18n";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

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
  const [keyText, setKeyText] = useState("");
  const [keyEntries, setKeyEntries] = useState<
    { id: number; original: string | null; value: string }[]
  >([]);
  const keyIdRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const plan = plans.find((item) => item.id === planId);
  const keyOptions = plan?.keys?.map((item) => ({
    value: item.key,
    label:
      (item.label || maskKey(item.key)) +
      (tool?.configuredKey === item.label ? ` (${t("currentlyUsed")})` : ""),
  })) ?? [];
  const selectedKeyOption =
    keyOptions.find((item) => item.value === keyText) ??
    (keyText.trim() ? { value: keyText, label: maskKey(keyText) } : null);
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
    if (!tool) {
      setKeyText(plan?.keys?.[0]?.key ?? "");
      setKeyEntries(
        plan?.keys?.map((item) => ({
          id: keyIdRef.current++,
          original: item.key,
          value: item.key,
        })) ?? [],
      );
      return;
    }
    if (planId !== tool.configuredPlan) {
      setKeyText("");
      return;
    }
    const label = tool.configuredKey || "";
    const match = label
      ? plan?.keys?.find((item) => item.label === label)
      : plan?.keys?.[0];
    setKeyText(match?.key ?? "");
  }, [planId, tool, plan]);
  const save = async (event: React.SubmitEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (model !== (plan?.model || ""))
        await core.savePlan(planId, undefined, model || undefined);
      if (tool) {
        const trimmedKey = keyText.trim();
        if (!trimmedKey) throw new Error(t("keyValuePlaceholder"));
        const existing = plan?.keys?.find((item) => item.key === trimmedKey);
        let labelToApply = existing?.label ?? "";
        if (!existing) {
          await core.addKey(planId, trimmedKey, trimmedKey);
          labelToApply = trimmedKey;
        }
        await core.applyTool(tool.name, planId, labelToApply || undefined);
      } else {
        const originalKeys = plan?.keys?.map((item) => item.key) ?? [];
        const keptOriginals = keyEntries
          .map((entry) => entry.original)
          .filter((key): key is string => key !== null);
        for (const oldKey of originalKeys) {
          if (!keptOriginals.includes(oldKey))
            await core.deleteKey(planId, oldKey);
        }
        for (const entry of keyEntries) {
          const value = entry.value.trim();
          if (entry.original !== null) {
            if (value && value !== entry.original)
              await core.editKey(planId, entry.original, value);
          } else if (value) {
            await core.addKey(planId, value);
          }
        }
      }
      setMessage(t("saved"));
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  const keyCombobox = (
    <Combobox
      items={keyOptions}
      value={selectedKeyOption}
      onValueChange={(item) => setKeyText(item?.value ?? "")}
      inputValue={keyText}
      onInputValueChange={(text) => setKeyText(text)}
      itemToStringLabel={(item: { value: string }) => item.value}
    >
      <ComboboxInput placeholder={t("keyValuePlaceholder")} />
      <ComboboxContent>
        <ComboboxEmpty>{t("noMatches")}</ComboboxEmpty>
        <ComboboxList>
          {(item: { value: string; label: string }) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
  return (
    <div className="p-8">
      <section className="mb-10 flex items-start gap-6 bg-surface-container-low p-8 rounded-xl">
        <button onClick={onBack} className="p-2 hover:bg-surface-container rounded-lg">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-3xl font-headline font-extrabold">
            {tool ? t("configureTool", { tool: tool.displayName })
              : t("configurePlanTitle")}
          </h2>
          <p className="text-on-surface-variant mt-2">
            {tool?.description || t("configDescription")}
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
              {tool ? (
                <Field label={t("keyToApply")}>{keyCombobox}</Field>
              ) : (
                <Field label={t("apiKey")}>
                  <div className="space-y-3">
                    {keyEntries.map((entry) => (
                      <div key={entry.id} className="flex gap-2">
                        <input
                          value={entry.value}
                          className="input flex-1"
                          placeholder={t("keyValuePlaceholder")}
                          onChange={(event) =>
                            setKeyEntries((current) =>
                              current.map((item) =>
                                item.id === entry.id
                                  ? { ...item, value: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          title={t("deleteKey")}
                          onClick={() =>
                            setKeyEntries((current) =>
                              current.filter((item) => item.id !== entry.id),
                            )
                          }
                          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-error"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setKeyEntries((current) => [
                          ...current,
                          { id: keyIdRef.current++, original: null, value: "" },
                        ])
                      }
                      className="px-4 py-2 rounded-xl bg-surface-container-high text-primary font-bold text-sm"
                    >
                      {t("addKey")}
                    </button>
                  </div>
                </Field>
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

function Field({ label, children }: {
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

function maskKey(key: string) {
  if (key.length <= 8) return key;
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
