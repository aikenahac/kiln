# Capabilities

No row is verified against a live account yet: no Expo token was used while building. "Implemented" means the UI and a schema-validated operation exist (`pnpm schema:check` validates every document against eas-cli's `graphql.schema.json`). It does not mean every token can perform the action; the server's answer is authoritative and its error is shown.

| Feature or action | Implemented | Unsupported | Needs repo config | Needs backend | Token / role restriction | Live verified | Source |
|---|---|---|---|---|---|---|---|
| Token validation, actor, accounts | yes | — | no | no | restricted tokens may list no accounts | no | `graphql/queries/UserQuery.ts` |
| Projects: search, cursor pagination, sort by recent activity | yes | — | no | no | account membership | no | `Account.appsPaginated`, `AccountAppsSortByField.LATEST_ACTIVITY_TIME` |
| App icons | yes | — | no | no | none | no | `App.profileImageUrl` (the icon expo.dev shows), falling back to deprecated `App.icon` (classic updates only) |
| Favorites, recents | yes (local) | — | no | no | — | n/a | Kiln preference store |
| Project hub with live summaries | yes | — | no | no | each section fails on its own | no | composed from the rows below |
| Build list with platform/status/distribution filters | yes | — | no | no | project read | no | `App.builds(filter: BuildFilter)` |
| Build detail, related submissions, fingerprint | yes | — | no | no | project read | no | `graphql/types/Build.ts`, `BuildsWithSubmissionsById` |
| Cancel build | yes | — | no | no | build permission | no | `commands/build/cancel.ts` |
| Install internal build on this device | yes | — | no | no | internal distribution, platform match, APK only on Android | no | `build/utils/url.ts getInternalDistributionInstallUrl` |
| Retry / rebuild | no | yes | — | — | — | — | `retryIosBuild` is used by `build:resign`, not rebuild; a rebuild needs source. Kiln points to workflows |
| Build logs: steps accordion, phase chips, search stepping, copy/share per step | yes | — | no | no | signed URL expires; Kiln re-queries the build | no | `commandUtils/logs/parseLogs.ts`, `@expo/eas-build-job` phase names |
| Phase lamps from real log steps | yes | — | no | no | status-only lamps when logs aren't loaded | no | same as above |
| Realtime log streaming (builds, workflow job runs) | yes | submissions (no realtime target) | no | no | needs the realtime token mutations; falls back to polling | no | `utils/centrifuge.ts`, `commandUtils/logs/state.ts`, `RealtimeLogsMutation.ts`, `RealtimeLogsTargetType { BUILD, JOB_RUN }` |
| Submissions list with platform/status filters | yes | — | no | no | project read | no | `App.submissions(filter: SubmissionFilter)` |
| Submission detail and logs | yes | — | no | no | project read | no | `SubmissionFragment`, `Submission.logFiles` |
| Retry submission | yes | — | no | no | `canRetry` and within `maxRetryTimeMinutes`; uses credentials already on Expo | no | `commands/submit/retry.ts`, `SubmissionMutation.retrySubmission` |
| Cancel submission | yes | — | no | no | submission permission | no | `SubmissionMutation.cancelSubmission` |
| Create a submission from a build | no | — | — | — | — | — | needs store config that eas-cli reads from eas.json; open Expo or use a workflow |
| Update groups with platform filter, group detail | yes | — | no | no | project read | no | `ViewUpdateGroupsOnApp`, `ViewUpdatesByGroup` |
| Republish / roll back an update | no | — | yes | — | — | — | `eas update:republish` uploads from the CLI; out of scope without a workflow |
| Channels with split bars | yes | — | no | no | project read | no | `ChannelQuery.ts`, `rollout/branch-mapping.ts` |
| Change rollout %, start/finish/roll back rollout, point to branch | yes, with confirm sheet | — | no | no | publish permission; protected channels need PUBLISH_PROTECTED | no | `commands/channel/edit.ts` `editUpdateChannel` |
| Pause / resume channel | yes, with confirm sheet | — | no | no | publish permission | no | `commands/channel/pause.ts`, `resume.ts` |
| Create / delete channel | yes, with confirm sheet | — | no | no | publish permission | no | `channel/queries.ts`, `channel/delete.ts` (scheduled deletion) |
| Custom (non-rollout) branch mappings | read-only | — | — | — | — | — | shown as "custom", edit in Expo |
| Branches: list, create, rename, delete | yes | — | no | no | publish permission; Expo refuses deleting a mapped branch | no | `branch/queries.ts`, `commands/branch/rename.ts`, `branch/delete.ts` |
| Workflow runs with status/workflow filters | yes | — | no | no | project read | no | `AppByIdWorkflowRunsFilteredByStatusQuery` |
| Run detail, jobs, job logs, links to build/submission jobs | yes | — | no | no | project read | no | `WorkflowRunByIdWithJobs`, `WorkflowJobFragment` |
| Cancel run, rerun all or failed jobs | yes | — | no | no | run permission | no | `WorkflowRunMutation.ts` |
| Start a workflow run at a git ref | yes, without dispatch inputs | inputs not yet | yes: GitHub repo connected in Expo | no | run permission | no | `WorkflowRevisionMutation.getOrCreateWorkflowRevisionFromGitRef` + `createWorkflowRunFromGitRef` |
| Environment variables: names, visibility, scope, environment filter | yes | values: intentionally | no | no | — | no | `EnvironmentVariablesByAppId` without `value` |
| Hosting deployments and aliases | yes, read-only | promote/delete | no | no | — | no | `worker/queries.ts` |
| Apple devices: list, class filter, rename, remove | yes | enable/disable (no input field) | no | no | account credentials permission | no | `credentials/ios/api/graphql/*AppleDevice*` |
| Device registration link | yes | — | needs an Apple team on the account | no | — | no | `devices/actions/create/registrationUrlMethod.ts` |
| Members and roles | yes, read-only | invite/remove | no | no | often admin/owner only | no | `Account.membersPaginated` |
| Usage and billing | Expo link | in-app | — | — | — | — | `Account.usageMetrics` exists but isn't used in eas-cli; not wired until checked against a real account |
| Webhooks | no | not yet | — | — | admin | — | `WebhookQuery.ts` |
| Unified activity (7 days, 6 most active projects) | yes | — | no | no | sources that fail are counted, not fatal | no | client merge of the first page per source |
| Background notifications | setting only | — | — | yes | — | — | no backend in this repo |
