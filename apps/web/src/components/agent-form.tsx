"use client";

import { Button } from "@enos/ui";
import { useState } from "react";
import type { ProviderMeta } from "@/server/providers/registry";

const AVATARS = ["🤖", "🦊", "🦉", "🐙", "🛰️", "🧭", "📦", "✈️", "🧾", "🎨"];

export function AgentForm({
  providers,
  action,
  defaults,
  submitLabel,
}: {
  providers: ProviderMeta[];
  action: (formData: FormData) => Promise<void>;
  defaults?: {
    displayName?: string;
    description?: string;
    avatar?: string;
    provider?: string;
    model?: string;
    systemPrompt?: string;
  };
  submitLabel: string;
}) {
  const [provider, setProvider] = useState(
    defaults?.provider ?? providers[0].id,
  );
  const [avatar, setAvatar] = useState(defaults?.avatar ?? AVATARS[0]);
  const meta = providers.find((p) => p.id === provider) ?? providers[0];

  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
      <div>
        <label className="font-ui text-sm text-gray-600" htmlFor="displayName">
          Name
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          maxLength={80}
          defaultValue={defaults?.displayName}
          placeholder="Procurement agent"
          className="mt-1 w-full rounded-lg border border-evergreen-100 px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
        />
      </div>

      <div>
        <span className="font-ui text-sm text-gray-600">Avatar</span>
        <input type="hidden" name="avatar" value={avatar} />
        <div className="mt-2 flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAvatar(a)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg transition-colors ${
                avatar === a
                  ? "border-evergreen bg-evergreen-50"
                  : "border-evergreen-100 hover:bg-evergreen-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-ui text-sm text-gray-600" htmlFor="description">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="description"
          name="description"
          maxLength={500}
          defaultValue={defaults?.description}
          placeholder="What this agent is for"
          className="mt-1 w-full rounded-lg border border-evergreen-100 px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-ui text-sm text-gray-600" htmlFor="provider">
            Model provider
          </label>
          <select
            id="provider"
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-1 w-full rounded-lg border border-evergreen-100 bg-white px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-ui text-sm text-gray-600" htmlFor="model">
            Model
          </label>
          <input
            id="model"
            name="model"
            required
            list="model-suggestions"
            defaultValue={defaults?.model ?? meta.suggestedModels[0]}
            className="mt-1 w-full rounded-lg border border-evergreen-100 px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
          />
          <datalist id="model-suggestions">
            {meta.suggestedModels.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className="font-ui text-sm text-gray-600" htmlFor="systemPrompt">
          System prompt
        </label>
        <textarea
          id="systemPrompt"
          name="systemPrompt"
          rows={6}
          maxLength={20000}
          defaultValue={defaults?.systemPrompt}
          placeholder="You are…"
          className="mt-1 w-full rounded-lg border border-evergreen-100 px-4 py-2.5 font-body text-sm outline-none focus:border-teal"
        />
      </div>

      <div>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
