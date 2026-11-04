// Provenance: expo/eas-cli main, packages/eas-cli/src/graphql/{queries,types}; checked 2026-11-03.
// Build fields follow BuildFragment (graphql/types/Build.ts); App.icon and
// appsPaginated sortByField LATEST_ACTIVITY_TIME follow generated.ts.
// Expo's GraphQL schema is internal and has no public compatibility guarantee.
export const CURRENT_ACTOR = `
  query KilnCurrentActor {
    meActor {
      __typename id
      ... on User { email username }
      ... on SSOUser { username }
      ... on Robot { firstName }
      accounts {
        id name
        ownerUserActor { id username }
        viewerUserPermission2 { permissions effectivePermissions }
      }
    }
  }
`;

const PROJECT_FIELDS = `
  id name slug fullName latestActivity
  profileImageUrl icon { url primaryColor }
  ownerAccount { id name }
  githubRepository { id metadata { githubRepoOwnerName githubRepoName } }
`;

export const PROJECTS = `
  query KilnProjects($accountId: String!, $first: Int!, $after: String, $search: String, $sort: AccountAppsSortByField!) {
    account {
      byId(accountId: $accountId) {
        id
        appsPaginated(first: $first, after: $after, filter: { sortByField: $sort, searchTerm: $search }) {
          edges { cursor node { ${PROJECT_FIELDS} } }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
`;

export const PROJECT_BY_ID = `
  query KilnProject($appId: String!) {
    app { byId(appId: $appId) { ${PROJECT_FIELDS} } }
  }
`;

const BUILD_FRAGMENT = `
  fragment KilnBuild on Build {
    id status platform error { errorCode message docsUrl }
    artifacts { buildUrl xcodeBuildLogsUrl applicationArchiveUrl buildArtifactsUrl }
    initiatingActor { id displayName } logFiles
    app { id name slug fullName profileImageUrl icon { url primaryColor } ownerAccount { id name } }
    distribution isForIosSimulator buildProfile appIdentifier sdkVersion appVersion appBuildVersion
    runtime { id version } fingerprint { id hash } gitCommitHash gitCommitMessage
    initialQueuePosition queuePosition estimatedWaitTimeLeftSeconds
    createdAt updatedAt completedAt expirationDate message
    metrics { buildWaitTime buildQueueTime buildDuration }
  }
`;

export const BUILDS = `
  query KilnBuilds($appId: String!, $offset: Int!, $limit: Int!, $filter: BuildFilter) {
    app { byId(appId: $appId) { id builds(offset: $offset, limit: $limit, filter: $filter) { id ...KilnBuild } } }
  }
  ${BUILD_FRAGMENT}
`;

// Build.submissions: BuildsWithSubmissionsById in graphql/queries/BuildQuery.ts.
export const BUILD_BY_ID = `
  query KilnBuildById($buildId: ID!) {
    builds { byId(buildId: $buildId) {
      id ...KilnBuild
      submissions { id status platform createdAt completedAt }
    } }
  }
  ${BUILD_FRAGMENT}
`;

export const CANCEL_BUILD = `
  mutation KilnCancelBuild($buildId: ID!) { build { cancelBuild(buildId: $buildId) { id status } } }
`;

// Realtime logs (graphql/mutations/RealtimeLogsMutation.ts, utils/centrifuge.ts).
// The tokens are short-lived Centrifugo credentials Expo issues for
// wss://logs.expo.dev; the personal access token never leaves the GraphQL call.
export const REALTIME_CONNECTION_TOKEN = `
  mutation KilnRealtimeConnectionToken {
    realtimeLogs { generateCentrifugoConnectionToken { token } }
  }
`;

export const REALTIME_SUBSCRIPTION_TOKEN = `
  mutation KilnRealtimeSubscriptionToken($target: RealtimeLogsTargetInput!) {
    realtimeLogs { generateCentrifugoSubscriptionToken(target: $target) { channel token } }
  }
`;
