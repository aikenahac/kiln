# API provenance

Checked against `expo/eas-cli` main on 2026-11-03 and Expo SDK 58 documentation.

Expo's GraphQL schema is used by EAS CLI but is not presented as a public, versioned compatibility contract. Kiln keeps every dependency in `src/api/documents/` and treats server authorization as authoritative.

| Concern | Source |
|---|---|
| GraphQL endpoint | `packages/eas-cli/src/commandUtils/context/contextUtils/createGraphqlClient.ts:55-56` |
| Personal access-token header | `packages/eas-cli/src/api.ts:34-43` and `createGraphqlClient.ts:73-83` |
| Current actor | `packages/eas-cli/src/graphql/queries/UserQuery.ts:14-41` |
| Actor accounts and permission fields | `packages/eas-cli/src/graphql/types/Actor.ts` and `types/Account.ts` |
| Cursor-paginated account projects | generated schema `Account.appsPaginated`, `AccountAppsConnection` |
| Build list/filter pagination | `packages/eas-cli/src/graphql/queries/BuildQuery.ts:116-151` |
| Build fields/artifacts/log URLs | `packages/eas-cli/src/graphql/types/Build.ts` |
| Build cancellation | `packages/eas-cli/src/commands/build/cancel.ts:21-42` |
| Build JSONL log download | `packages/eas-cli/src/build/logs.ts:17-40` |
| Submission pages | `packages/eas-cli/src/graphql/queries/SubmissionQuery.ts:93-131` |
| Update groups | `packages/eas-cli/src/graphql/queries/UpdateQuery.ts:212-247` |
| Branches and channels | `packages/eas-cli/src/graphql/queries/BranchQuery.ts` and `ChannelQuery.ts` |
| Workflows | `packages/eas-cli/src/graphql/queries/AppQuery.ts:107-138` and `WorkflowRunQuery.ts` |
| Environment-variable metadata | `packages/eas-cli/src/graphql/queries/EnvironmentVariablesQuery.ts:111-143` (without `value`) |
| App icon, recency sort | generated schema `App.icon`, `AccountAppsSortByField.LATEST_ACTIVITY_TIME` |
| Submission detail, logs, retry, cancel | `graphql/types/Submission.ts`, `graphql/mutations/SubmissionMutation.ts`, `commands/submit/retry.ts` |
| Update group detail | `graphql/queries/UpdateQuery.ts` `ViewUpdatesByGroup` |
| Channel mapping edits, pause, create, delete | `commands/channel/edit.ts`, `pause.ts`, `resume.ts`, `channel/queries.ts`, `channel/delete.ts` |
| Rollout mapping format | `rollout/branch-mapping.ts`, `channel/branch-mapping.ts` |
| Branch create, rename, delete | `branch/queries.ts`, `commands/branch/rename.ts`, `branch/delete.ts` |
| Workflow runs, jobs, cancel, rerun, start from git ref | `graphql/queries/AppQuery.ts`, `WorkflowRunQuery.ts`, `graphql/types/WorkflowJob.ts`, `graphql/mutations/WorkflowRunMutation.ts`, `WorkflowRevisionMutation.ts` |
| Apple devices, rename, remove, registration link | `credentials/ios/api/graphql/queries/AppleDeviceQuery.ts`, `mutations/AppleDeviceMutation.ts`, `AppleDeviceRegistrationRequestMutation.ts`, `devices/actions/create/registrationUrlMethod.ts` |
| Hosting deployments and aliases | `worker/queries.ts` |
| Members | generated schema `Account.membersPaginated`, `UserPermission` |
| Log step grouping | `commandUtils/logs/parseLogs.ts`, `commandUtils/logs/types.ts` (MIT) |
| Phase display names, results, markers | `@expo/eas-build-job@27.4.0` `dist/logs.js` |
| expo.dev page and install URLs | `build/utils/url.ts`, `submit/utils/urls.ts` |
| Realtime logs | `utils/centrifuge.ts`, `commandUtils/logs/state.ts`, `commandUtils/logs/watcher.ts`, `graphql/mutations/RealtimeLogsMutation.ts`, `api.ts getEASLogsWebsocketUrl`; client `centrifuge@5.7.1` (same version as eas-cli) |

Official platform references:

- [Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/)
- [Expo Router native tabs](https://docs.expo.dev/router/advanced/native-tabs/)
- [Expo SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/)
- [Expo Crypto](https://docs.expo.dev/versions/v58.0.0/sdk/crypto/)

Run `pnpm schema:check` after editing anything in `src/api/documents/`. It downloads eas-cli's `graphql.schema.json` (cached under `node_modules/.cache/kiln`; pass `--refresh` to update) and validates every document. A pass means the fields and arguments exist in the schema eas-cli ships. It doesn't prove that a given token is allowed to use them.

Artifact and log URLs are fetched with a separate plain `fetch` call. The Expo bearer token is never sent to their hosts or across redirects.
