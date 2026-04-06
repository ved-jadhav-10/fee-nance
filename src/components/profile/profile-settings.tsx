"use client";

import { useEffect, useState } from "react";
import {
  dashboardRangeLabel,
  dashboardRangeValues,
  defaultUserPreferences,
  type DashboardDefaultRange,
} from "@/lib/user-preferences";

interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    preferences: {
      currency: "INR";
      dashboardDefaultRange: DashboardDefaultRange;
    };
  };
}

export function ProfileSettings() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dashboardDefaultRange, setDashboardDefaultRange] =
    useState<DashboardDefaultRange>(defaultUserPreferences.dashboardDefaultRange);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/private/me", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Request failed");
        }

        const result = (await response.json()) as MeResponse;

        if (!isMounted) {
          return;
        }

        setName(result.user.name);
        setEmail(result.user.email);
        setDashboardDefaultRange(result.user.preferences.dashboardDefaultRange);
      } catch {
        if (isMounted) {
          setError("Failed to load profile settings");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    const response = await fetch("/api/private/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        preferences: {
          currency: "INR",
          dashboardDefaultRange,
        },
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Failed to update profile settings");
      setIsSaving(false);
      return;
    }

    setSuccess("Profile saved");
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
        <p className="text-sm text-[var(--color-muted)]">Loading profile settings...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
      <div className="mb-4">
        <h2 className="text-lg text-[var(--color-text)]">Profile and Preferences</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Update your display name and default dashboard range.
        </p>
      </div>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
        <div className="space-y-1">
          <label htmlFor="profile-name" className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Full Name
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
            required
            minLength={2}
            maxLength={80}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="profile-email" className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            value={email}
            className="w-full rounded-md border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--color-muted)]"
            readOnly
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="profile-currency"
            className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]"
          >
            Currency
          </label>
          <input
            id="profile-currency"
            value="INR"
            className="w-full rounded-md border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[var(--color-muted)]"
            readOnly
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="profile-dashboard-range"
            className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]"
          >
            Default Dashboard Range
          </label>
          <select
            id="profile-dashboard-range"
            value={dashboardDefaultRange}
            onChange={(event) => setDashboardDefaultRange(event.target.value as DashboardDefaultRange)}
            className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          >
            {dashboardRangeValues.map((value) => (
              <option key={value} value={value} className="bg-[var(--color-bg)]">
                {dashboardRangeLabel[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-contrast)] transition hover:brightness-110 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save profile"}
          </button>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
        </div>
      </form>
    </section>
  );
}
