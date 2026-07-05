"use client";

import { Button, Card } from "@enos/ui";
import { useState } from "react";
import { deleteModelKey, saveModelKey } from "@/server/actions/model-keys";
import type { ProviderMeta } from "@/server/providers/registry";

type SafeKey = {
  provider: string;
  label: string | null;
  last4: string;
  baseUrl: string | null;
};

export function ModelKeys({
  keys,
  providers,
}: {
  keys: SafeKey[];
  providers: ProviderMeta[];
}) {
  const [provider, setProvider] = useState(providers[0].id);
  const meta = providers.find((p) => p.id === provider) ?? providers[0];

  return (
    <Card className="mt-6 max-w-xl">
      <h2 className="font-ui text-sm font-medium uppercase tracking-wider text-evergreen-700">
        Model keys
      </h2>
      <p className="mt-1 font-body text-sm text-gray-500">
        Bring your own keys. They are encrypted at rest and never sent back to
        the browser — only the last 4 characters are shown.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {keys.map((k) => (
          <li
            key={k.provider}
            className="flex items-center justify-between rounded-lg border border-evergreen-100 px-4 py-2.5"
          >
            <div>
              <span className="font-ui text-sm text-evergreen">
                {providers.find((p) => p.id === k.provider)?.label ?? k.provider}
              </span>
              <span className="ml-2 font-mono text-xs text-gray-400">
                ••••{k.last4}
              </span>
              {k.label ? (
                <span className="ml-2 font-body text-xs text-gray-400">
                  {k.label}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="font-ui text-xs text-danger underline"
              onClick={() => void deleteModelKey(k.provider)}
            >
              Remove
            </button>
          </li>
        ))}
        {keys.length === 0 ? (
          <li className="font-body text-sm text-gray-400">No keys yet.</li>
        ) : null}
      </ul>

      <form
        action={async (fd) => {
          await saveModelKey(fd);
          (document.getElementById("mk-secret") as HTMLInputElement).value = "";
        }}
        className="mt-6 flex flex-col gap-3 border-t border-evergreen-100 pt-5"
      >
        <div className="grid grid-cols-2 gap-3">
          <select
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-lg border border-evergreen-100 bg-white px-3 py-2 font-body text-sm outline-none focus:border-teal"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            id="mk-secret"
            name="secret"
            type="password"
            required
            autoComplete="off"
            placeholder={meta.keyHint}
            className="rounded-lg border border-evergreen-100 px-3 py-2 font-body text-sm outline-none focus:border-teal"
          />
        </div>
        {meta.requiresBaseUrl ? (
          <input
            name="baseUrl"
            type="url"
            placeholder="Base URL (default: https://api.openai.com/v1)"
            className="rounded-lg border border-evergreen-100 px-3 py-2 font-body text-sm outline-none focus:border-teal"
          />
        ) : null}
        <div>
          <Button type="submit" size="sm">
            Save key
          </Button>
        </div>
      </form>
    </Card>
  );
}
