import { LockedTile } from "@enos/ui";
import { isOnWaitlist } from "@/server/actions/waitlist";
import { WaitlistButton } from "./waitlist-button";

/**
 * Shared shell for roadmap-gated routes (Phase B–E). Navigation exists,
 * the feature doesn't — a locked tile with a waitlist CTA.
 */
export async function RoadmapPage({
  feature,
  title,
  phase,
  description,
}: {
  feature: string;
  title: string;
  phase: string;
  description: string;
}) {
  const joined = await isOnWaitlist(feature);
  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">{title}</h1>
      <div className="mt-8 max-w-2xl">
        <LockedTile
          title={title}
          phase={phase}
          description={description}
          cta={<WaitlistButton feature={feature} initiallyJoined={joined} />}
        />
      </div>
    </div>
  );
}
