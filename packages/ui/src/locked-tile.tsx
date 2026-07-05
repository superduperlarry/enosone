import type { ReactNode } from "react";
import { Card } from "./card";

/**
 * Roadmap gate: the feature exists in navigation, not in product.
 * Renders a locked, brand-styled tile with a waitlist CTA slot.
 */
export function LockedTile({
  title,
  phase,
  description,
  cta,
}: {
  title: string;
  phase: string;
  description: string;
  cta?: ReactNode;
}) {
  return (
    <Card tone="evergreen" className="relative overflow-hidden">
      <div className="absolute right-4 top-4 rounded-full border border-lime/40 px-3 py-1 font-ui text-xs uppercase tracking-wider text-lime">
        {phase}
      </div>
      <div className="mb-1 font-ui text-xs uppercase tracking-widest text-lavender">
        Coming soon
      </div>
      <h3 className="font-display text-2xl text-white">{title}</h3>
      <p className="mt-2 max-w-md font-body text-sm text-evergreen-100">
        {description}
      </p>
      {cta ? <div className="mt-5">{cta}</div> : null}
    </Card>
  );
}
