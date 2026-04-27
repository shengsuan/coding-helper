import { join, dirname } from "path";
import { settings } from "./settings.js";
import { logger } from "../utils/logger.js";
import { Model, CONFIG_DIR } from "./constants.js";
import { mkdir, readFile, writeFile } from "fs/promises";

interface ApiModel {
    api_name: string;
    context_window: number;
    max_tokens: number;
    architecture?: {
        input?: string;
        output?: string;
    };
    support_apis?:string[];
}

export async function getModels(pid: string): Promise<Model[]> {
    try {
        const url = settings.getPlanConfig(pid)?.base_url + "/models";
        const res = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        const data = (await res.json()) as { data?: ApiModel[] };
        if (!res.ok || !Array.isArray(data.data)) {
            return [];
        }

        const result: Model[] = data.data.map((it) => {
            const input = it.architecture?.input?.split("+")?.filter(it=>it!="") || [];
            const output = it.architecture?.output?.split("+")?.filter(it=>it!="") || [];
            const hasModalities = input.length > 0 && output.length > 0;

            return {
                id: it.api_name,
                contextLength: it.context_window,
                maxTokens: it.max_tokens,
                support_apis: it.support_apis || [],
                ...(hasModalities && { modalities: { input, output } })
            };
        });

        if (result.length > 0) {
            result.sort((a: Model, b: Model) => a.id.localeCompare(b.id));
            await save(`${pid}_models.json`, result);
            return result;
        }
        return await read<Model[]>(`${pid}_models.json`);
    } catch (e) {
        logger.logError("getModels()", e);
        return [];
    }
}

export async function save(fn: string, obj: unknown): Promise<void> {
    try {
        const filePath = join(CONFIG_DIR, fn);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, JSON.stringify(obj), "utf-8");
    } catch (error) {
        throw new Error(`Failed to save: ${fn}`);
    }
}

export async function read<T = any>(fn: string): Promise<T | []> {
    try {
        const filePath = join(CONFIG_DIR, fn);
        const content = await readFile(filePath, "utf-8");
        return JSON.parse(content) as T;
    } catch (error: any) {
        if (error.code === "ENOENT") {
            return [];
        }
        throw new Error(`Failed to read: ${fn}`);
    }
}