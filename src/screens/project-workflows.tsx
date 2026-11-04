import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { errorCopy } from "@/api/errors";
import { useProject } from "@/api/hooks/use-projects";
import { useWorkflowActions, useWorkflowRuns, useWorkflows } from "@/api/hooks/use-workflows";
import { statusLamps } from "@/api/logs";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { ResourceList } from "@/components/resource-list";
import { Chips, Note, SectionTitle } from "@/components/screen-parts";
import { StatusRow } from "@/components/status-row";
import { duration, relativeTime, runLabel, runRowStatus, shortHash } from "@/lib/format";
import { useDetailRoutes } from "@/lib/routes";
import { usePalette } from "@/providers/theme-provider";
import type { Workflow, WorkflowRunStatus } from "@/types/api";

const filters = ["All", "Running", "Failed", "Needs approval"] as const;
type Filter = (typeof filters)[number];
const statusFilter: Record<Filter, WorkflowRunStatus | undefined> = {
  All: undefined,
  Running: "IN_PROGRESS",
  Failed: "FAILURE",
  "Needs approval": "ACTION_REQUIRED",
};

export default function ProjectWorkflowsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [filter, setFilter] = useState<Filter>("All");
  const [workflowId, setWorkflowId] = useState<string>();
  const project = useProject(id);
  const workflows = useWorkflows(id);
  const runs = useWorkflowRuns(id, { status: statusFilter[filter], workflowId });
  const actions = useWorkflowActions(id);
  const routes = useDetailRoutes();
  const colors = usePalette();
  const [trigger, setTrigger] = useState<{ workflow: Workflow; gitRef: string } | null>(null);
  const [error, setError] = useState<string>();
  const items = useMemo(() => runs.data?.pages.flatMap((page) => page.items) ?? [], [runs.data]);
  const repo = project.data?.githubRepository?.metadata;

  return (
    <>
      <ResourceList
        data={items}
        keyExtractor={(run) => run.id}
        query={runs}
        header={
          <>
            {workflows.data?.length ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 android:px-4">
                  {[undefined, ...workflows.data].map((workflow) => {
                    const selected = workflowId === workflow?.id;
                    return (
                      <Pressable
                        key={workflow?.id ?? "all"}
                        onPress={() => setWorkflowId(workflow?.id)}
                        className={`h-9 justify-center rounded-full px-4 ${selected ? "bg-ink" : "bg-raised-2"}`}
                      >
                        <Text className={`text-[15px] font-semibold ${selected ? "text-ground" : "text-ink"}`}>
                          {workflow ? (workflow.name ?? workflow.fileName) : "All workflows"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
            <Chips options={filters} value={filter} onChange={setFilter} />
          </>
        }
        empty={{
          title: "No workflow runs",
          body: workflows.data?.length
            ? "No run matches these filters."
            : "Add a workflow file under .eas/workflows in the repository, then push.",
        }}
        footer={
          workflows.data?.length ? (
            <View>
              <SectionTitle>Run a workflow</SectionTitle>
              {repo ? (
                <Note>{`Runs on Expo from ${repo.githubRepoOwnerName}/${repo.githubRepoName} at the branch or commit you choose.`}</Note>
              ) : (
                <Note>Running a workflow from here needs the project&apos;s GitHub repository connected in Expo.</Note>
              )}
              {workflows.data.map((workflow) => (
                <StatusRow
                  key={workflow.id}
                  title={workflow.name ?? workflow.fileName}
                  subtitle={workflow.fileName}
                  onPress={
                    repo
                      ? () =>
                          setTrigger({
                            workflow,
                            gitRef:
                              items
                                .find((run) => run.workflow.id === workflow.id && run.requestedGitRef)
                                ?.requestedGitRef?.replace("refs/heads/", "") ?? "",
                          })
                      : undefined
                  }
                />
              ))}
            </View>
          ) : undefined
        }
        renderItem={(run) => (
          <StatusRow
            title={run.gitCommitMessage?.split("\n")[0] ?? run.name}
            subtitle={[
              run.workflow.name ?? run.workflow.fileName,
              runLabel(run.status),
              run.durationSeconds ? duration(run.durationSeconds) : undefined,
              run.requestedGitRef?.replace("refs/heads/", ""),
              shortHash(run.gitCommitHash),
            ]
              .filter(Boolean)
              .join(" · ")}
            error={run.errors[0]?.message}
            meta={relativeTime(run.createdAt)}
            status={runRowStatus(run.status)}
            phases={statusLamps(run.status)}
            onPress={() => routes.run(id, run.id)}
          />
        )}
      />
      {trigger ? (
        <ConfirmSheet
          visible
          title={`Run ${trigger.workflow.name ?? trigger.workflow.fileName}`}
          body="Expo reads the workflow file at this ref and starts a run. Jobs in it may build, submit or publish. Workflows that require dispatch inputs can't be started from here yet."
          scope={[
            { label: "Project", value: project.data ? `${project.data.ownerAccount.name} / ${project.data.slug}` : id },
            { label: "Workflow", value: trigger.workflow.fileName },
          ]}
          visual={
            <TextInput
              value={trigger.gitRef}
              onChangeText={(gitRef) => setTrigger({ ...trigger, gitRef })}
              placeholder="Branch, tag or commit"
              placeholderTextColor={colors.ink2}
              autoCapitalize="none"
              autoCorrect={false}
              className="h-12 rounded-field bg-raised-2 px-4 font-mono text-[16px] text-ink"
            />
          }
          confirmLabel="Start run"
          safeLabel="Not now"
          disabled={!trigger.gitRef.trim()}
          pending={actions.run.isPending}
          error={error}
          onClose={() => {
            setTrigger(null);
            setError(undefined);
          }}
          onConfirm={() =>
            actions.run.mutate(
              { fileName: trigger.workflow.fileName, gitRef: trigger.gitRef.trim() },
              {
                onSuccess: (result) => {
                  setTrigger(null);
                  routes.run(id, result.id);
                },
                onError: (failure) => setError(errorCopy(failure)),
              },
            )
          }
        />
      ) : null}
    </>
  );
}
