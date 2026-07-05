import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ProviderAdapter } from "./types";

export const gemini: ProviderAdapter = {
  id: "gemini",
  label: "Google Gemini",
  keyHint: "AIza…",
  suggestedModels: ["gemini-2.5-pro", "gemini-2.5-flash"],
  createModel: ({ apiKey, model }) =>
    createGoogleGenerativeAI({ apiKey })(model),
};
