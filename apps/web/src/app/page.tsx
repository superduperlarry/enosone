import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-evergreen text-white">
      <header className="flex items-center justify-between px-8 py-6">
        <span className="font-display text-2xl lowercase tracking-tight text-lime">
          enos
        </span>
        <Link
          href="/sign-in"
          className="rounded-full border border-lime/40 px-5 py-2 font-ui text-sm text-lime transition-colors hover:bg-lime hover:text-evergreen-950"
        >
          Sign in
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <p className="mb-4 font-ui text-sm uppercase tracking-[0.3em] text-teal">
          ENOS One
        </p>
        <h1 className="max-w-3xl font-display text-5xl leading-tight sm:text-6xl">
          One workspace for AI agents —{" "}
          <span className="text-lime">with working money.</span>
        </h1>
        <p className="mt-6 max-w-xl font-body text-lg text-evergreen-100">
          Bring any model. Run your agents in one place. Give each one real
          spending power under rules you define — limits, allowlists, and
          approvals you decide in-app.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/agents"
            className="rounded-full bg-lime px-8 py-3 font-ui font-medium text-evergreen-950 transition-colors hover:bg-lime-300"
          >
            Open workspace
          </Link>
        </div>
      </section>

      <footer className="px-8 py-6 text-center font-ui text-xs text-evergreen-100/60">
        You approve every rule. Every spend is attributed to the agent that
        made it.
      </footer>
    </main>
  );
}
