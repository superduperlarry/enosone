"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@enos/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  attachPaymentMethod,
  createSetupIntent,
} from "@/server/actions/wallet";

function CardForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const result = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });
    if (result.error) {
      setBusy(false);
      setError(result.error.message ?? "Card could not be saved.");
      return;
    }
    await attachPaymentMethod(result.setupIntent.id);
    setBusy(false);
    onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error ? <p className="font-body text-sm text-danger">{error}</p> : null}
      <div>
        <Button onClick={() => void save()} disabled={busy || !stripe}>
          {busy ? "Saving…" : "Save card"}
        </Button>
      </div>
    </div>
  );
}

export function AddCard({ publishableKey }: { publishableKey: string }) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  useEffect(() => {
    if (open && !clientSecret) {
      void createSetupIntent().then(({ clientSecret }) =>
        setClientSecret(clientSecret),
      );
    }
  }, [open, clientSecret]);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Add a card</Button>;
  }

  return (
    <div className="max-w-md rounded-card border border-evergreen-100 bg-white p-6">
      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CardForm
            onDone={() => {
              setOpen(false);
              setClientSecret(null);
              router.refresh();
            }}
          />
        </Elements>
      ) : (
        <p className="font-body text-sm text-gray-400">Loading…</p>
      )}
    </div>
  );
}
