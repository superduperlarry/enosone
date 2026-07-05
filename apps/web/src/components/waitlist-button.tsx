"use client";

import { Button } from "@enos/ui";
import { useState, useTransition } from "react";
import { joinWaitlist } from "@/server/actions/waitlist";

export function WaitlistButton({
  feature,
  initiallyJoined,
}: {
  feature: string;
  initiallyJoined: boolean;
}) {
  const [joined, setJoined] = useState(initiallyJoined);
  const [pending, startTransition] = useTransition();

  if (joined) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-lime/40 px-5 py-2 font-ui text-sm text-lime">
        ✓ You&apos;re on the list — we&apos;ll email you
      </span>
    );
  }

  return (
    <Button
      variant="accent"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await joinWaitlist(feature);
          setJoined(true);
        })
      }
    >
      {pending ? "Joining…" : "Join the waitlist"}
    </Button>
  );
}
