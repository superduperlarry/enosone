import { Button, Card, EmptyState } from "@enos/ui";
import { AddCard } from "@/components/add-card";
import {
  addSimulatedCard,
  listPaymentMethods,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from "@/server/actions/wallet";
import { isSimulatedMode } from "@/server/spend/processor";

export default async function WalletPage() {
  const methods = await listPaymentMethods();
  const simulated = isSimulatedMode();
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">Wallet</h1>
      <p className="mt-1 font-body text-sm text-gray-500">
        The card on file your agents spend from. Card details live with the
        payment processor — we keep only a token, the brand, and the last 4.
      </p>

      {simulated ? (
        <div className="mt-4 max-w-xl rounded-lg border border-lime bg-lime/10 px-4 py-3 font-body text-sm text-evergreen-700">
          Processor keys aren&apos;t configured, so the wallet is in simulated
          mode — add a test card and the full spend flow works locally.
        </div>
      ) : null}

      <div className="mt-8 flex max-w-xl flex-col gap-3">
        {methods.length === 0 ? (
          <EmptyState
            title="No payment method yet"
            description="Add a card to give your agents a funded method to spend from."
          />
        ) : (
          methods.map((m) => (
            <Card key={m.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-evergreen px-2.5 py-1 font-ui text-xs uppercase text-white">
                  {m.brand}
                </span>
                <span className="font-mono text-sm">•••• {m.last4}</span>
                <span className="font-body text-xs text-gray-400">
                  {String(m.expMonth).padStart(2, "0")}/{m.expYear}
                </span>
                {m.isDefault ? (
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 font-ui text-xs text-evergreen-700">
                    default
                  </span>
                ) : null}
              </div>
              <div className="flex gap-3">
                {!m.isDefault ? (
                  <form action={setDefaultPaymentMethod.bind(null, m.id)}>
                    <button className="font-ui text-xs text-teal underline">
                      Make default
                    </button>
                  </form>
                ) : null}
                <form action={removePaymentMethod.bind(null, m.id)}>
                  <button className="font-ui text-xs text-danger underline">
                    Remove
                  </button>
                </form>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="mt-6">
        {simulated ? (
          <form action={addSimulatedCard}>
            <Button type="submit" variant="accent">
              Add simulated test card
            </Button>
          </form>
        ) : publishableKey ? (
          <AddCard publishableKey={publishableKey} />
        ) : (
          <p className="font-body text-sm text-caution">
            NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing — set it to enable
            card entry.
          </p>
        )}
      </div>
    </div>
  );
}
