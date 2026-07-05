import type { LanguageModel } from "ai";

/**
 * A model-provider adapter. ALL provider-specific behavior lives in this
 * directory — a provider conditional anywhere else in the codebase is a
 * rejected change (CI greps for it).
 */
export interface ProviderAdapter {
  id: string;
  label: string;
  /** Shown in the key form, e.g. "sk-ant-…" */
  keyHint: string;
  /** Suggested models for the picker; free-text is always allowed. */
  suggestedModels: string[];
  /** Whether the adapter needs a caller-supplied base URL. */
  requiresBaseUrl?: boolean;
  createModel(opts: {
    apiKey: string;
    model: string;
    baseUrl?: string | null;
  }): LanguageModel;
}
