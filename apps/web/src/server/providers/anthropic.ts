import { createAnthropic } from "@ai-sdk/anthropic";
import type { ProviderAdapter } from "./types";

export const anthropic: ProviderAdapter = {
  id: "anthropic",
  label: "Anthropic",
  keyHint: "sk-ant-…",
  suggestedModels: ["claude-fable-5", "claude-sonnet-5", "claude-haiku-4-5"],
  createModel: ({ apiKey, model }) => createAnthropic({ apiKey })(model),
};
