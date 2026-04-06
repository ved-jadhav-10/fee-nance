import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-[120px] text-[var(--color-text)] md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(127,119,221,0.16),transparent_42%),radial-gradient(circle_at_12%_18%,rgba(83,74,183,0.18),transparent_36%),radial-gradient(circle_at_88%_22%,rgba(83,74,183,0.14),transparent_44%),linear-gradient(to_bottom,transparent_0%,#08070f_94%)]" />

      <div className="relative app-shell stagger-enter flex flex-col gap-8">
        <header className="panel sticky top-4 z-20 flex h-[60px] items-center justify-between gap-4 bg-[rgba(8,7,15,0.85)] px-5 backdrop-blur-[12px]">
          <p className="font-display text-[22px] text-[var(--color-text)]">Fee-Nance</p>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/login" className="text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
              Login
            </Link>
            <Link
              href="/register"
              className="btn-primary px-5 py-2 text-[13px] font-medium"
            >
              Create Account
            </Link>
          </nav>
        </header>

        <section className="py-8 text-center md:py-16">
          <p className="section-overline">Premium Finance Command</p>
          <h1 className="mt-5 font-display text-[40px] text-[var(--color-text)] md:text-[64px]">
            The money story, now <span className="display-highlight">alive</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-[15px] font-normal text-[var(--color-text-secondary)] md:text-[19px]">
            Fee-Nance unifies personal planning and group settlements in a single private workspace with deliberate clarity, cinematic depth, and zero visual noise.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn-primary px-8 py-3 text-[14px] font-medium">
              Start Your Workspace
            </Link>
            <Link href="/login" className="btn-ghost px-8 py-3 text-[14px] font-medium">
              Sign In
            </Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="panel p-6">
            <p className="section-overline">Currency</p>
            <h2 className="mt-3 text-[16px] font-medium text-[var(--color-text)]">INR Only Foundation</h2>
            <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">
              Every insight is consistent and comparable without conversion noise.
            </p>
          </article>
          <article className="panel p-6">
            <p className="section-overline">Splits</p>
            <h2 className="mt-3 text-[16px] font-medium text-[var(--color-text)]">Equal, Custom, Percentage</h2>
            <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">
              Precise multi-payer logic for real-world expense situations.
            </p>
          </article>
          <article className="panel p-6">
            <p className="section-overline">Automation</p>
            <h2 className="mt-3 text-[16px] font-medium text-[var(--color-text)]">Recurring Controls</h2>
            <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">
              Monthly and yearly recurrence keeps forecasting continuously current.
            </p>
          </article>
        </section>

        <section className="panel p-7 md:p-8">
          <p className="section-overline">What You Get</p>
          <h2 className="mt-4 font-display text-[32px] text-[var(--color-text)] md:text-[44px]">
            A private finance stack with <span className="display-highlight">intent</span>.
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ul className="space-y-3 text-[14px] text-[var(--color-text-secondary)]">
              <li>Personal transactions and budgets with category intelligence</li>
              <li>Recurring rules and month-wise trend visibility</li>
              <li>Date-range summaries for focused review windows</li>
            </ul>
            <ul className="space-y-3 text-[14px] text-[var(--color-text-secondary)]">
              <li>Group invite onboarding and member-aware expense records</li>
              <li>Multi-payer splits with net owes and settlement balancing</li>
              <li>Email-password plus Google OAuth authentication</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
