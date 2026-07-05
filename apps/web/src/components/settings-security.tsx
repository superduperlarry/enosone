"use client";

import { Button, Card } from "@enos/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Passkey = { id: string; name?: string | null; createdAt?: Date | null };

export function SettingsSecurity() {
  const router = useRouter();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await authClient.passkey.listUserPasskeys();
    setPasskeys(data ?? []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addPasskey() {
    setStatus(null);
    const result = await authClient.passkey.addPasskey({
      name: `${navigator.platform || "device"} · ${new Date().toLocaleDateString()}`,
    });
    if (result?.error) {
      setStatus(result.error.message ?? "Could not register the passkey.");
      return;
    }
    setStatus("Passkey added.");
    void refresh();
  }

  async function removePasskey(id: string) {
    await authClient.passkey.deletePasskey({ id });
    void refresh();
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }

  return (
    <div>
      <Card className="mt-6 max-w-xl">
        <h2 className="font-ui text-sm font-medium uppercase tracking-wider text-evergreen-700">
          Passkeys
        </h2>
        <p className="mt-1 font-body text-sm text-gray-500">
          Sign in with Face ID, Windows Hello, or a security key — no code
          needed.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {passkeys.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center justify-between rounded-lg border border-evergreen-100 px-4 py-2.5"
            >
              <span className="font-body text-sm">
                {pk.name ?? "Unnamed passkey"}
              </span>
              <button
                type="button"
                className="font-ui text-xs text-danger underline"
                onClick={() => void removePasskey(pk.id)}
              >
                Remove
              </button>
            </li>
          ))}
          {passkeys.length === 0 ? (
            <li className="font-body text-sm text-gray-400">
              No passkeys yet.
            </li>
          ) : null}
        </ul>
        <div className="mt-4">
          <Button size="sm" onClick={() => void addPasskey()}>
            Add a passkey
          </Button>
        </div>
        {status ? (
          <p className="mt-3 font-body text-sm text-gray-600">{status}</p>
        ) : null}
      </Card>

      <Card className="mt-6 max-w-xl">
        <h2 className="font-ui text-sm font-medium uppercase tracking-wider text-evergreen-700">
          Session
        </h2>
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}
