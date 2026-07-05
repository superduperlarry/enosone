import { anthropic } from "./anthropic";
import { deepseek } from "./deepseek";
import { gemini } from "./gemini";
import { kimi } from "./kimi";
import { openaiCompatible } from "./openai-compatible";
import type { ProviderAdapter } from "./types";
import { xai } from "./xai";

const adapters: ProviderAdapter[] = [
  anthropic,
  deepseek,
  gemini,
  kimi,
  openaiCompatible,
  xai,
];

const registry = new Map(adapters.map((a) => [a.id, a]));

export function listProviders(): ProviderAdapter[] {
  return adapters;
}

export function getProvider(id: string): ProviderAdapter {
  const adapter = registry.get(id);
  if (!adapter) throw new Error(`Unknown model provider: ${id}`);
  return adapter;
}

/** Serializable metadata for client components (no factory functions). */
export function listProviderMeta() {
  return adapters.map(({ id, label, keyHint, suggestedModels, requiresBaseUrl }) => ({
    id,
    label,
    keyHint,
    suggestedModels,
    requiresBaseUrl: requiresBaseUrl ?? false,
  }));
}

export type ProviderMeta = ReturnType<typeof listProviderMeta>[number];
