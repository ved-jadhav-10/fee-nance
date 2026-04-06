import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen px-5 py-[120px] text-[var(--color-text)]">
      <div className="app-shell flex w-full max-w-[520px] flex-col gap-8">
        <div className="text-center">
          <p className="section-overline">Start Securely</p>
          <h1 className="mt-4 font-display text-[40px] text-[var(--color-text)]">
            Build your <span className="display-highlight">workspace</span>.
          </h1>
        </div>

        <div className="panel p-8">
        <div className="space-y-2">
          <p className="section-overline">Fee-Nance</p>
          <h2 className="font-display text-[32px] text-[var(--color-text)]">Create your account</h2>
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            Start tracking expenses, budgets, and shared group balances.
          </p>
        </div>

        <RegisterForm />

        <p className="text-[14px] text-[var(--color-text-secondary)]">
          Already have an account?{" "}
          <Link className="text-[var(--color-accent-light)] hover:text-[var(--color-text)]" href="/login">
            Sign in
          </Link>
        </p>
        </div>
      </div>
    </main>
  );
}
