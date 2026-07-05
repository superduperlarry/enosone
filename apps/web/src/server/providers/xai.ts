import { createXai } from "@ai-sdk/xai";
import type { ProviderAdapter } from "./types";

export const xai: ProviderAdapter = {
  id: "xai",
  label: "xAI",
  keyHint: "xai-…",
  suggestedModels: ["grok-4", "grok-4-fast"],
  createModel: ({ apiKey, model }) => createXai({ apiKey })(model),
};
