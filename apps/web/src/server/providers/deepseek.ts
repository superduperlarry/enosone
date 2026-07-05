import { createDeepSeek } from "@ai-sdk/deepseek";
import type { ProviderAdapter } from "./types";

export const deepseek: ProviderAdapter = {
  id: "deepseek",
  label: "DeepSeek",
  keyHint: "sk-…",
  suggestedModels: ["deepseek-chat", "deepseek-reasoner"],
  createModel: ({ apiKey, model }) => createDeepSeek({ apiKey })(model),
};
