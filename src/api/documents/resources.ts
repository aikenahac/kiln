// Provenance: expo/eas-cli main, checked 2026-11-03. Each document names the
// eas-cli operation it mirrors. Expo's GraphQL schema is internal and may
// change without notice; keep every schema dependency in this folder.

const PROJECT_REF = `app { id name slug fullName profileImageUrl icon { url primaryColor } ownerAccount { id name } }`;
const ACTOR_REF = `actor { id displayName }`;

// SubmissionFragment (graphql/types/Submission.ts) + GetAllSubmissionsForApp.
const SUBMISSION_FIELDS = `
  id status platform createdAt updatedAt completedAt canRetry maxRetryTimeMinutes logFiles
  initiatingActor { id displayName }
  error { errorCode message }
  ${PROJECT_REF}
  submittedBuild { id appVersion appBuildVersion buildProfile }
  androidConfig { track releaseStatus rollout }
  iosConfig { ascAppIdentifier }
`;

export const SUBMISSIONS = `
  query KilnSubmissions($appId: String!, $offset: Int!, $limit: Int!, $filter: SubmissionFilter!) {
    app { byId(appId: $appId) { id submissions(filter: $filter, offset: $offset, limit: $limit) { ${SUBMISSION_FIELDS} } } }
  }
`;

export const SUBMISSION_BY_ID = `
  query KilnSubmission($submissionId: ID!) {
    submissions { byId(submissionId: $submissionId) { ${SUBMISSION_FIELDS} } }
  }
`;

// SubmissionMutation.ts retrySubmissionAsync / cancelSubmissionAsync.
export const RETRY_SUBMISSION = `
  mutation KilnRetrySubmission($parentSubmissionId: ID!) {
    submission { retrySubmission(parentSubmissionId: $parentSubmissionId) { submission { id status } } }
  }
`;

export const CANCEL_SUBMISSION = `
  mutation KilnCancelSubmission($submissionId: ID!) {
    submission { cancelSubmission(submissionId: $submissionId) { id status } }
  }
`;

// UpdateFragment (graphql/types/Update.ts), ViewUpdateGroupsOnApp, ViewUpdatesByGroup.
const UPDATE_FIELDS = `
  id group message createdAt platform runtimeVersion gitCommitHash isRollBackToEmbedded
  environment rolloutPercentage branch { id name } ${ACTOR_REF}
`;

export const UPDATE_GROUPS = `
  query KilnUpdateGroups($appId: String!, $offset: Int!, $limit: Int!, $filter: UpdatesFilter) {
    app { byId(appId: $appId) { id updateGroups(offset: $offset, limit: $limit, filter: $filter) { ${UPDATE_FIELDS} } } }
  }
`;

export const UPDATE_GROUP = `
  query KilnUpdateGroup($groupId: ID!) { updatesByGroup(group: $groupId) { ${UPDATE_FIELDS} } }
`;

// ChannelQuery.ts / BranchQuery.ts list documents.
const BRANCH_SUMMARY = `
  id name
  updateGroups(offset: 0, limit: 1) { id group message createdAt runtimeVersion }
`;

export const CHANNELS = `
  query KilnChannels($appId: String!, $offset: Int!, $limit: Int!) {
    app { byId(appId: $appId) { id updateChannels(offset: $offset, limit: $limit) {
      id name isPaused isProtected createdAt updatedAt branchMapping
      updateBranches(offset: 0, limit: 10) { ${BRANCH_SUMMARY} }
    } } }
  }
`;

export const BRANCHES = `
  query KilnBranches($appId: String!, $offset: Int!, $limit: Int!) {
    app { byId(appId: $appId) { id updateBranches(offset: $offset, limit: $limit) {
      ${BRANCH_SUMMARY} createdAt updatedAt
    } } }
  }
`;

// commands/channel/edit.ts, channel/queries.ts, channel/delete.ts,
// commands/channel/pause.ts, resume.ts.
export const EDIT_CHANNEL_MAPPING = `
  mutation KilnEditChannel($channelId: ID!, $branchMapping: String!) {
    updateChannel { editUpdateChannel(channelId: $channelId, branchMapping: $branchMapping) { id branchMapping } }
  }
`;

export const CREATE_CHANNEL = `
  mutation KilnCreateChannel($appId: ID!, $name: String!, $branchMapping: String!) {
    updateChannel { createUpdateChannelForApp(appId: $appId, name: $name, branchMapping: $branchMapping) { id name } }
  }
`;

export const DELETE_CHANNEL = `
  mutation KilnDeleteChannel($channelId: ID!) {
    updateChannel { scheduleUpdateChannelDeletion(channelId: $channelId) { id } }
  }
`;

export const PAUSE_CHANNEL = `
  mutation KilnPauseChannel($channelId: ID!) {
    updateChannel { pauseUpdateChannel(channelId: $channelId) { id isPaused } }
  }
`;

export const RESUME_CHANNEL = `
  mutation KilnResumeChannel($channelId: ID!) {
    updateChannel { resumeUpdateChannel(channelId: $channelId) { id isPaused } }
  }
`;

// branch/queries.ts, commands/branch/rename.ts, branch/delete.ts.
export const CREATE_BRANCH = `
  mutation KilnCreateBranch($appId: ID!, $name: String!) {
    updateBranch { createUpdateBranchForApp(appId: $appId, name: $name) { id name } }
  }
`;

export const RENAME_BRANCH = `
  mutation KilnRenameBranch($input: EditUpdateBranchInput!) {
    updateBranch { editUpdateBranch(input: $input) { id name } }
  }
`;

export const DELETE_BRANCH = `
  mutation KilnDeleteBranch($branchId: ID!) {
    updateBranch { scheduleUpdateBranchDeletion(branchId: $branchId) { id } }
  }
`;

// WorkflowRunFragment / WorkflowJobFragment (graphql/types), AppQuery
// AppByIdWorkflowRunsFilteredByStatusQuery, WorkflowRunByIdWithJobs.
const RUN_FIELDS = `
  id name status gitCommitHash gitCommitMessage requestedGitRef triggerEventType
  createdAt updatedAt finalizedAt durationSeconds
  errors { title message } ${ACTOR_REF}
  workflow { id name fileName }
`;

export const WORKFLOWS = `
  query KilnWorkflows($appId: String!) {
    app { byId(appId: $appId) { id workflows { id name fileName createdAt updatedAt } } }
  }
`;

export const WORKFLOW_RUNS = `
  query KilnWorkflowRuns($appId: String!, $first: Int!, $after: String, $filter: AppWorkflowRunFilterInput) {
    app { byId(appId: $appId) { id workflowRunsPaginated(first: $first, after: $after, filter: $filter) {
      edges { node { ${RUN_FIELDS} } }
      pageInfo { hasNextPage endCursor }
    } } }
  }
`;

export const WORKFLOW_RUN = `
  query KilnWorkflowRun($workflowRunId: ID!) {
    workflowRuns { byId(workflowRunId: $workflowRunId) {
      ${RUN_FIELDS}
      workflow { id name fileName app { id name slug fullName profileImageUrl icon { url primaryColor } ownerAccount { id name } } }
      jobs {
        id key name status type createdAt updatedAt errors { title message }
        turtleJobRun { id logFileUrls errors { errorCode message } }
        turtleBuild { id status platform }
        turtleSubmission { id status platform }
      }
    } }
  }
`;

// WorkflowRunMutation.ts, WorkflowRevisionMutation.ts.
export const CANCEL_WORKFLOW_RUN = `
  mutation KilnCancelWorkflowRun($workflowRunId: ID!) {
    workflowRun { cancelWorkflowRun(workflowRunId: $workflowRunId) { id status } }
  }
`;

export const RETRY_WORKFLOW_RUN = `
  mutation KilnRetryWorkflowRun($workflowRunId: ID!, $fromFailedJobs: Boolean) {
    workflowRun { retryWorkflowRun(workflowRunId: $workflowRunId, fromFailedJobs: $fromFailedJobs) { id status } }
  }
`;

export const WORKFLOW_REVISION_FROM_GIT_REF = `
  mutation KilnWorkflowRevision($appId: ID!, $fileName: String!, $gitRef: String!) {
    workflowRevision { getOrCreateWorkflowRevisionFromGitRef(appId: $appId, fileName: $fileName, gitRef: $gitRef) { id } }
  }
`;

export const CREATE_WORKFLOW_RUN_FROM_GIT_REF = `
  mutation KilnRunWorkflow($workflowRevisionId: ID!, $gitRef: String!, $inputs: JSONObject) {
    workflowRun { createWorkflowRunFromGitRef(workflowRevisionId: $workflowRevisionId, gitRef: $gitRef, inputs: $inputs) { id } }
  }
`;

// EnvironmentVariablesByAppId (graphql/queries/EnvironmentVariablesQuery.ts).
// `value` is deliberately never requested.
export const ENVIRONMENT_VARIABLES = `
  query KilnEnvironmentVariables($appId: String!, $environment: EnvironmentVariableEnvironment) {
    app { byId(appId: $appId) {
      id environmentVariableEnvironments
      environmentVariables(environment: $environment) { id name visibility scope environments createdAt updatedAt }
    } }
  }
`;

// credentials/ios/api/graphql/queries/AppleDeviceQuery.ts and mutations.
export const APPLE_DEVICES = `
  query KilnAppleDevices($accountId: String!, $first: Int!, $after: String, $filter: AppleDeviceFilterInput) {
    account { byId(accountId: $accountId) { id
      appleTeams { id appleTeamIdentifier appleTeamName }
      appleDevicesPaginated(first: $first, after: $after, filter: $filter) {
        edges { node {
          id identifier name model deviceClass softwareVersion enabled createdAt
          appleTeam { id appleTeamIdentifier appleTeamName }
        } }
        pageInfo { hasNextPage endCursor }
      }
    } }
  }
`;

export const RENAME_APPLE_DEVICE = `
  mutation KilnRenameAppleDevice($id: ID!, $appleDeviceUpdateInput: AppleDeviceUpdateInput!) {
    appleDevice { updateAppleDevice(id: $id, appleDeviceUpdateInput: $appleDeviceUpdateInput) { id name } }
  }
`;

export const DELETE_APPLE_DEVICE = `
  mutation KilnDeleteAppleDevice($deviceId: ID!) {
    appleDevice { deleteAppleDevice(id: $deviceId) { id } }
  }
`;

export const CREATE_DEVICE_REGISTRATION = `
  mutation KilnDeviceRegistration($appleTeamId: ID!, $accountId: ID!) {
    appleDeviceRegistrationRequest { createAppleDeviceRegistrationRequest(appleTeamId: $appleTeamId, accountId: $accountId) { id } }
  }
`;

// worker/queries.ts PaginatedWorkerDeployments / PaginatedWorkerDeploymentAliases.
export const WORKER_DEPLOYMENTS = `
  query KilnWorkerDeployments($appId: String!, $first: Int!, $after: String) {
    app { byId(appId: $appId) {
      id
      workerDeploymentAliases(first: 20) { edges { node { id aliasName url } } }
      workerDeployments(first: $first, after: $after) {
        edges { node { id url deploymentIdentifier deploymentDomain createdAt initiatingActor { id displayName } } }
        pageInfo { hasNextPage endCursor }
      }
    } }
  }
`;

// Account.membersPaginated / UserPermission (generated.ts). Read-only.
export const ACCOUNT_MEMBERS = `
  query KilnAccountMembers($accountId: String!, $first: Int!, $after: String) {
    account { byId(accountId: $accountId) { id
      membersPaginated(first: $first, after: $after) {
        edges { node { id role permissions actor { id displayName } } }
        pageInfo { hasNextPage endCursor }
      }
    } }
  }
`;
