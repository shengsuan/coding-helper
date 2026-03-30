import { type Model } from "./constants.js";

export class UnsupportedModelError extends Error {
  constructor(
    public modelId: string,
    public requiredApi: string,
    public toolName: string
  ) {
    super(`Model ${modelId} does not support required API: ${requiredApi}`);
    this.name = "UnsupportedModelError";
  }
}

export function filterSupportedModels(
  models: Model[],
  requiredApi: string = "/v1/chat/completions"
): Model[] {
  return models.filter(m => m.support_apis?.includes(requiredApi));
}

export function validateModelSupport(
  models: Model[],
  modelId: string | undefined,
  requiredApi: string = "/v1/chat/completions",
  toolName: string = "Tool"
): string {
  if (!modelId) {
    const firstSupported = filterSupportedModels(models, requiredApi)[0];
    if (!firstSupported) {
      throw new Error(`No models support required API: ${requiredApi}`);
    }
    return firstSupported.id;
  }

  const model = models.find(m => m.id === modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  if (!model.support_apis?.includes(requiredApi)) {
    throw new UnsupportedModelError(modelId, requiredApi, toolName);
  }
  return modelId;
}
