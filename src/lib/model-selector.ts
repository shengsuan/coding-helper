import { type Model } from "./constants.js";

export class UnsupportedModelError extends Error {
  constructor(
    public modelId: string,
    public requiredApi: string[],
    public toolName: string
  ) {
    super(`模型 ${modelId} 不支持必要的 API 接口: ${requiredApi.join(', ')}`);
    this.name = "UnsupportedModelError";
  }
}

export function filterSupportedModels(
  models: Model[],
  requiredApi: string[] = ["/v1/chat/completions"]
): Model[] {
  return models.filter(m => m.support_apis?.some(api => requiredApi.includes(api)));
}

export function validateModelSupport(
  models: Model[],
  modelId: string | undefined,
  requiredApi: string[] = ["/v1/chat/completions"],
  toolName: string = "Tool"
): string {
  if (!modelId) {
    const supported = filterSupportedModels(models, requiredApi)[0];
    if (!supported) {
      throw new Error(`暂时没有兼容的模型: ${requiredApi}`);
    }
    return supported.id;
  }

  const model = models.find(m => m.id === modelId);
  if (!model) {
    throw new Error(`未找到模型: ${modelId}`);
  }

  if (!model.support_apis?.some(api => requiredApi.includes(api))) {
    throw new UnsupportedModelError(modelId, requiredApi, toolName);
  }
  return modelId;
}
