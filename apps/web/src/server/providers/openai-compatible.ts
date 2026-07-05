import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ProviderAdapter } from "./types";

/** OpenAI itself, or any OpenAI-compatible endpoint (vLLM, Together, …). */
export const openaiCompatible: ProviderAdapter = {
  id: "openai-compatible",
  label: "OpenAI-compatible",
  keyHint: "sk-…",
  suggestedModels: ["gpt-5.2", "gpt-5-mini"],
  requiresBaseUrl: true,
  createModel: ({ apiKey, model, baseUrl }) =>
    createOpenAICompatible({
      name: "openai-compatible",
      apiKey,
      baseURL: baseUrl || "https://api.openai.com/v1",
    })(model),
};
