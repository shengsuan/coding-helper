import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { settings } from "./settings.js";

export type LocaleCode = "zh_CN" | "en_US";

const LOCALES_DIR = join(dirname(fileURLToPath(import.meta.url)), "../locales");

function loadJson(code: LocaleCode): Record<string, unknown> {
  const p = join(LOCALES_DIR, `${code}.json`);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

const bundles: Record<LocaleCode, Record<string, unknown>> = {
  zh_CN: loadJson("zh_CN"),
  en_US: loadJson("en_US"),
};

let current: LocaleCode = "zh_CN";

function resolve(obj: Record<string, unknown>, path: string): string | undefined {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (cur && typeof cur === "object" && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

export const locale = {
  loadFromConfig(lang?: string) {
    current = (lang || settings.getLang()) as LocaleCode;
  },

  setLocale(code: LocaleCode) {
    current = code;
  },

  getLocale(): LocaleCode {
    return current;
  },

  t(key: string, params?: Record<string, string>): string {
    let text = resolve(bundles[current], key) ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, v);
      }
    }
    return text;
  },
};
