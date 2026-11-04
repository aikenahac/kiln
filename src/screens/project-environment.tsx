import { useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { useEnvironmentVariables } from "@/api/hooks/use-account";
import { ResourceList } from "@/components/resource-list";
import { Chips, Note } from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import { relativeTime } from "@/lib/format";

const visibilityWord = {
  PUBLIC: "plain text",
  SENSITIVE: "sensitive",
  SECRET: "secret",
} as const;

export default function ProjectEnvironmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [environment, setEnvironment] = useState("all");
  const query = useEnvironmentVariables(id, environment === "all" ? undefined : environment);
  const environments = ["all", ...(query.data?.environments ?? [])];
  return (
    <ResourceList
      data={query.data?.variables ?? []}
      keyExtractor={(variable) => variable.id}
      query={query}
      header={
        <>
          <Chips
            options={environments}
            value={environment}
            onChange={setEnvironment}
            labels={{ all: "All" }}
          />
          <Note>Names and metadata only. Kiln never requests or stores values.</Note>
        </>
      }
      empty={{
        title: "No variables",
        body: "Add variables with eas env:create or in Expo.",
      }}
      renderItem={(variable) => (
        <StatusRow
          title={variable.name}
          subtitle={[
            variable.visibility ? visibilityWord[variable.visibility] : undefined,
            variable.scope === "SHARED" ? "account-wide" : "project",
            variable.environments?.length ? variable.environments.join(", ") : "no environment",
          ]
            .filter(Boolean)
            .join(" · ")}
          meta={relativeTime(variable.updatedAt)}
        />
      )}
    />
  );
}
