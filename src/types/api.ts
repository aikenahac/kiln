export type Account = {
  id: string;
  name: string;
  ownerUserActor?: { id: string; username: string } | null;
  viewerUserPermission2?: {
    permissions: string[];
    effectivePermissions: string[];
  } | null;
};

export type Actor = {
  __typename: "User" | "SSOUser" | "Robot" | "PartnerActor";
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  accounts: Account[];
};

export type Platform = "ANDROID" | "IOS";

export type AppIcon = { url: string; primaryColor?: string | null };

export type ProjectSummary = {
  id: string;
  name: string;
  slug: string;
  fullName: string;
  /** The icon expo.dev shows. `icon` only exists for classic-update projects. */
  profileImageUrl?: string | null;
  icon?: AppIcon | null;
  ownerAccount: { id: string; name: string };
};

export type Project = ProjectSummary & {
  latestActivity?: string | null;
  githubRepository?: {
    id: string;
    metadata: { githubRepoOwnerName: string; githubRepoName: string };
  } | null;
};

export type BuildStatus =
  | "NEW"
  | "IN_QUEUE"
  | "IN_PROGRESS"
  | "PENDING_CANCEL"
  | "FINISHED"
  | "ERRORED"
  | "CANCELED";

export type Build = {
  id: string;
  status: BuildStatus;
  platform: Platform;
  error?: {
    errorCode: string;
    message: string;
    docsUrl?: string | null;
  } | null;
  artifacts?: {
    buildUrl?: string | null;
    applicationArchiveUrl?: string | null;
    buildArtifactsUrl?: string | null;
    xcodeBuildLogsUrl?: string | null;
  } | null;
  initiatingActor?: { id: string; displayName: string } | null;
  logFiles: string[];
  app: ProjectSummary;
  distribution?: "INTERNAL" | "SIMULATOR" | "STORE" | null;
  isForIosSimulator?: boolean;
  buildProfile?: string | null;
  appIdentifier?: string | null;
  sdkVersion?: string | null;
  appVersion?: string | null;
  appBuildVersion?: string | null;
  runtime?: { id: string; version: string } | null;
  fingerprint?: { id: string; hash: string } | null;
  gitCommitHash?: string | null;
  gitCommitMessage?: string | null;
  initialQueuePosition?: number | null;
  queuePosition?: number | null;
  estimatedWaitTimeLeftSeconds?: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  expirationDate?: string | null;
  message?: string | null;
  metrics?: {
    buildWaitTime?: number | null;
    buildQueueTime?: number | null;
    buildDuration?: number | null;
  } | null;
};

export type BuildWithSubmissions = Build & {
  submissions: Pick<
    Submission,
    "id" | "status" | "platform" | "createdAt" | "completedAt"
  >[];
};

export type SubmissionStatus =
  | "AWAITING_BUILD"
  | "IN_QUEUE"
  | "IN_PROGRESS"
  | "FINISHED"
  | "ERRORED"
  | "CANCELED";

export type Submission = {
  id: string;
  status: SubmissionStatus;
  platform: Platform;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  canRetry: boolean;
  maxRetryTimeMinutes: number;
  logFiles: string[];
  initiatingActor?: { id: string; displayName: string } | null;
  error?: { errorCode?: string | null; message?: string | null } | null;
  app: ProjectSummary;
  submittedBuild?: {
    id: string;
    appVersion?: string | null;
    appBuildVersion?: string | null;
    buildProfile?: string | null;
  } | null;
  androidConfig?: {
    track: string;
    releaseStatus?: string | null;
    rollout?: number | null;
  } | null;
  iosConfig?: { ascAppIdentifier: string } | null;
};

export type ActorRef = { id: string; displayName: string };

export type Update = {
  id: string;
  group: string;
  message?: string | null;
  createdAt: string;
  platform: string;
  runtimeVersion: string;
  gitCommitHash?: string | null;
  isRollBackToEmbedded: boolean;
  environment?: string | null;
  rolloutPercentage?: number | null;
  branch: { id: string; name: string };
  actor?: ActorRef | null;
};

export type BranchSummary = {
  id: string;
  name: string;
  latestUpdate?: Pick<
    Update,
    "id" | "group" | "message" | "createdAt" | "runtimeVersion"
  > | null;
};

export type Branch = BranchSummary & {
  createdAt: string;
  updatedAt: string;
};

export type Channel = {
  id: string;
  name: string;
  isPaused: boolean;
  isProtected: boolean;
  createdAt: string;
  updatedAt: string;
  branchMapping: string;
  updateBranches: BranchSummary[];
};

export type WorkflowRunStatus =
  | "NEW"
  | "WAITING"
  | "IN_PROGRESS"
  | "ACTION_REQUIRED"
  | "SUCCESS"
  | "FAILURE"
  | "CANCELED";

export type WorkflowJobStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "PENDING_CANCEL"
  | "ACTION_REQUIRED"
  | "SUCCESS"
  | "FAILURE"
  | "CANCELED"
  | "SKIPPED";

export type Workflow = {
  id: string;
  name?: string | null;
  fileName: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowRun = {
  id: string;
  name: string;
  status: WorkflowRunStatus;
  gitCommitHash?: string | null;
  gitCommitMessage?: string | null;
  requestedGitRef?: string | null;
  triggerEventType: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
  durationSeconds?: number | null;
  errors: { title: string; message: string }[];
  actor?: ActorRef | null;
  workflow: { id: string; name?: string | null; fileName: string };
};

export type WorkflowJob = {
  id: string;
  key: string;
  name: string;
  status: WorkflowJobStatus;
  type: string;
  createdAt: string;
  updatedAt: string;
  errors: { title: string; message: string }[];
  turtleJobRun?: {
    id: string;
    logFileUrls: string[];
    errors: { errorCode: string; message: string }[];
  } | null;
  turtleBuild?: { id: string; status: BuildStatus; platform: Platform } | null;
  turtleSubmission?: {
    id: string;
    status: SubmissionStatus;
    platform: Platform;
  } | null;
};

export type WorkflowRunDetail = WorkflowRun & {
  jobs: WorkflowJob[];
  app: ProjectSummary;
};

export type EnvironmentVariable = {
  id: string;
  name: string;
  visibility?: "PUBLIC" | "SENSITIVE" | "SECRET" | null;
  scope: "PROJECT" | "SHARED";
  environments?: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export type AppleDeviceClass = "IPHONE" | "IPAD" | "MAC" | "UNKNOWN";

export type AppleDevice = {
  id: string;
  identifier: string;
  name?: string | null;
  model?: string | null;
  deviceClass?: AppleDeviceClass | null;
  softwareVersion?: string | null;
  enabled?: boolean | null;
  createdAt: string;
  appleTeam: {
    id: string;
    appleTeamIdentifier: string;
    appleTeamName?: string | null;
  };
};

export type WorkerDeployment = {
  id: string;
  url: string;
  deploymentIdentifier: string;
  deploymentDomain: string;
  createdAt: string;
  initiatingActor?: ActorRef | null;
};

export type WorkerAlias = {
  id: string;
  aliasName?: string | null;
  url: string;
};

export type AccountMember = {
  id: string;
  role: string;
  permissions: string[];
  actor: { id: string; displayName: string };
};

export type PageInfo = { hasNextPage: boolean; endCursor?: string | null };
export type Page<T> = { items: T[]; pageInfo: PageInfo };
