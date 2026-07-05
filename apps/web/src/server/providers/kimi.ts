import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ProviderAdapter } from "./types";

export const kimi: ProviderAdapter = {
  id: "kimi",
  label: "Kimi (Moonshot)",
  keyHint: "sk-…",
  suggestedModels: ["kimi-k2-0905-preview", "moonshot-v1-128k"],
  createModel: ({ apiKey, model }) =>
    createOpenAICompatible({
      name: "kimi",
      apiKey,
      baseURL: "https://api.moonshot.ai/v1",
    })(model),
};
