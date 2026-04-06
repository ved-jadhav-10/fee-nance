"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@/components/dashboard/use-query";

type GroupMember = {
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  role: "owner" | "member";
};

type Group = {
  _id: string;
  name: string;
  inviteCode: string;
  members: GroupMember[];
};

interface GroupPayload {
  groups: Group[];
}

export function GroupManager() {
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const { data, isLoading, error, reload } = useQuery<GroupPayload>("/api/private/groups");

  const handleCreateGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await fetch("/api/private/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName }),
    });

    setGroupName("");
    reload();
  };

  const handleJoinGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await fetch("/api/private/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
    });

    setInviteCode("");
    reload();
  };

  if (isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading groups...</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-red-400">Failed to load groups.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-5">
          <h2 className="text-lg">Create Group</h2>
          <form className="mt-4 flex gap-3" onSubmit={handleCreateGroup}>
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group Name"
              className="flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              required
            />
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-sm font-medium"
            >
              Create
            </button>
          </form>
        </article>

        <article className="panel p-5">
          <h2 className="text-lg">Join Group</h2>
          <form className="mt-4 flex gap-3" onSubmit={handleJoinGroup}>
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="Invite Code"
              className="flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm uppercase"
              required
            />
            <button
              type="submit"
              className="btn-ghost px-4 py-2 text-sm font-medium"
            >
              Join
            </button>
          </form>
        </article>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Your Groups</h2>
          <button
            type="button"
            onClick={reload}
            className="btn-ghost px-3 py-2 text-xs uppercase tracking-[0.16em]"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {data.groups.length ? (
            data.groups.map((group) => (
              <article key={group._id} className="rounded-md border border-[var(--color-border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base">{group.name}</h3>
                    <p className="text-xs text-[var(--color-muted)]">Invite: {group.inviteCode}</p>
                  </div>
                  <Link
                    href={`/groups/${group._id}`}
                    className="btn-primary px-3 py-2 text-xs font-medium uppercase tracking-[0.16em]"
                  >
                    Open
                  </Link>
                </div>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  Members: {group.members.map((member) => member.userId.name).join(", ")}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-[var(--color-muted)]">No groups yet. Create one or join with invite code.</p>
          )}
        </div>
      </section>
    </div>
  );
}
