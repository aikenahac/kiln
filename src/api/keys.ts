export const queryKeys = {
  actor: (epoch: number) => ["actor", epoch] as const,
  projects: (accountId: string, search = "", sort = "NAME") =>
    ["projects", accountId, search, sort] as const,
  project: (accountId: string, projectId: string) =>
    ["project", accountId, projectId] as const,
  builds: (accountId: string, projectId: string, filter = "all") =>
    ["builds", accountId, projectId, filter] as const,
  build: (accountId: string, projectId: string, buildId: string) =>
    ["build", accountId, projectId, buildId] as const,
  logs: (accountId: string, kind: string, id: string) =>
    ["logs", accountId, kind, id] as const,
  submissions: (accountId: string, projectId: string, filter = "all") =>
    ["submissions", accountId, projectId, filter] as const,
  submission: (accountId: string, projectId: string, submissionId: string) =>
    ["submission", accountId, projectId, submissionId] as const,
  updateGroups: (accountId: string, projectId: string, filter = "all") =>
    ["updateGroups", accountId, projectId, filter] as const,
  updateGroup: (accountId: string, projectId: string, groupId: string) =>
    ["updateGroup", accountId, projectId, groupId] as const,
  channels: (accountId: string, projectId: string) =>
    ["channels", accountId, projectId] as const,
  branches: (accountId: string, projectId: string) =>
    ["branches", accountId, projectId] as const,
  workflows: (accountId: string, projectId: string) =>
    ["workflows", accountId, projectId] as const,
  workflowRuns: (accountId: string, projectId: string, filter = "all") =>
    ["workflowRuns", accountId, projectId, filter] as const,
  workflowRun: (accountId: string, projectId: string, runId: string) =>
    ["workflowRun", accountId, projectId, runId] as const,
  environment: (accountId: string, projectId: string, environment = "all") =>
    ["environment", accountId, projectId, environment] as const,
  hosting: (accountId: string, projectId: string) =>
    ["hosting", accountId, projectId] as const,
  devices: (accountId: string, deviceClass = "all") =>
    ["devices", accountId, deviceClass] as const,
  members: (accountId: string) => ["members", accountId] as const,
  overview: (accountId: string) => ["overview", accountId] as const,
  activity: (accountId: string) => ["activity", accountId] as const,
};
