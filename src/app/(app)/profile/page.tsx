import type { Metadata } from "next";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { ProfilePage } from "@/components/profile/profile-page";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfileRoute() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your account details, appearance, and custom categories."
      />
      <ProfilePage
        userName={session?.user?.name ?? ""}
        userEmail={session?.user?.email ?? ""}
      />
    </div>
  );
}
