import { useMemo } from "react";

import { useAccountMembers } from "@/api/hooks/use-account";
import { ResourceList } from "@/components/resource-list";
import { Note, OpenInExpo } from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import { expoUrls } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";

const roleWord: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  DEVELOPER: "Developer",
  VIEW_ONLY: "Viewer",
  RELEASE_MANAGER: "Release manager",
  RUNNER: "Runner",
  CUSTOM: "Custom role",
  HAS_ADMIN: "Admin",
  NOT_ADMIN: "Member",
};

export default function MembersScreen() {
  const { account } = useAuth();
  const query = useAccountMembers();
  const members = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  return (
    <ResourceList
      data={members}
      keyExtractor={(member) => member.id}
      query={query}
      header={<Note>Read-only. Invite, remove or change roles in Expo.</Note>}
      empty={{
        title: "No members visible",
        body: "Personal accounts have one member. Organizations show members to roles allowed to see them.",
      }}
      footer={account ? <OpenInExpo url={expoUrls.accountSettings(account.name)} /> : undefined}
      renderItem={(member) => (
        <StatusRow
          title={member.actor.displayName}
          subtitle={[roleWord[member.role] ?? member.role, member.permissions.map((p) => p.toLowerCase()).join(", ")]
            .filter(Boolean)
            .join(" · ")}
        />
      )}
    />
  );
}
