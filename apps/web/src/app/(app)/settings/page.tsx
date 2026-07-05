import { ModelKeys } from "@/components/model-keys";
import { SettingsSecurity } from "@/components/settings-security";
import { listModelKeysSafe } from "@/server/actions/model-keys";
import { listProviderMeta } from "@/server/providers/registry";

export default async function SettingsPage() {
  const keys = await listModelKeysSafe();

  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">Settings</h1>
      <p className="mt-1 font-body text-sm text-gray-500">
        Sign-in methods and model keys. Sessions live in secure HttpOnly
        cookies.
      </p>
      <ModelKeys
        keys={keys.map(({ provider, label, last4, baseUrl }) => ({
          provider,
          label,
          last4,
          baseUrl,
        }))}
        providers={listProviderMeta()}
      />
      <SettingsSecurity />
    </div>
  );
}
