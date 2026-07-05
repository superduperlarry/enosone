import { LockedTile } from "@enos/ui";

/**
 * Shared shell for roadmap-gated routes (Phase B–E). Navigation exists,
 * the feature doesn't. Waitlist CTA is wired in milestone 7.
 */
export function RoadmapPage({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="font-display text-3xl text-evergreen">{title}</h1>
      <div className="mt-8 max-w-2xl">
        <LockedTile title={title} phase={phase} description={description} />
      </div>
    </div>
  );
}
