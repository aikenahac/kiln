# Architecture

## Runtime shape

Expo Router supplies a protected authentication stack and five native tabs: Now, Projects, Activity, Account and Search. Each tab owns a native stack (`src/components/tab-stack.tsx`).

Detail screens live once in `src/screens/` and are mounted as thin route files in the Now, Projects and Activity stacks (`build/[id]`, `build/[id]/logs`, `submission/[id]`, `submission/[id]/logs`, `run/[id]`, `run/[id]/job/[jobId]`, `update/[id]`). `useDetailRoutes()` in `src/lib/routes.ts` pushes into whichever of those tabs is current, so opening a build from Now stays in Now. Project-scoped lists (`projects/[id]/builds`, `submissions`, `updates`, `channels`, `branches`, `workflows`, `environment`, `hosting`) live only in the Projects stack. Devices and Members live in the Account stack.

TanStack Query owns server state. Query keys always include the account ID, plus the project ID where one exists (`src/api/keys.ts`). NetInfo drives `onlineManager` and AppState drives `focusManager`, so intervals pause offline and in the background. `usePollInterval` (`src/api/hooks/use-poll-interval.ts`) adds the per-screen focus check and the user's refresh interval (10, 15, 30 or 60 s, or manual). Every polling query stops once its data reaches a terminal status.

## Authentication and storage

The app validates a personal access token with `meActor` before persisting it. The token is held in a dedicated encrypted MMKV v4 instance. A 32-byte key is generated with `expo-crypto`, stored only in `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, and used with MMKV AES-256.

Preferences live in a separate unencrypted MMKV instance: appearance, refresh interval, favorites, recents and the selected account. `useStringList` and `useRefreshInterval` read them reactively through `useMMKVString` / `useMMKVNumber`, so a star toggled on one screen shows everywhere. Android backup is disabled.

If the SecureStore key is missing but the encrypted MMKV instance remains, Kiln deletes the orphaned store and explains why sign-in is needed. Logout aborts transport controllers, bumps the session epoch, cancels queries, clears the cache and recents, and deletes both the encrypted instance and its key. Responses from an older epoch are rejected.

## API boundary

- `src/api/transport.ts`: bearer-authenticated GraphQL POSTs, timeouts, aborts, transient retry with jitter, `Retry-After`, GraphQL errors on HTTP 200, opt-in partial data. `fetchSignedText` fetches log and artifact URLs with no Expo token.
- `src/api/documents/`: every GraphQL document, each annotated with the eas-cli operation it mirrors. `pnpm schema:check` validates all of them against eas-cli's published `graphql.schema.json`.
- `src/api/services/`: one module per domain (`core`, `submissions`, `updates`, `workflows`, `account`, `summary`, `activity`), with typed results only.
- `src/api/hooks/`: query and mutation hooks. Mutations invalidate only their project's keys.
- `src/api/logs.ts`: log parsing and step grouping (see below).

The Expo GraphQL schema is internal. Documents are isolated so a schema change is fixed in one folder.

## Logs

Build, submission and workflow-job logs are JSONL files at signed URLs. `loadLogFiles` downloads them without the token and merges multiple files by `logId`. `groupLogLinesIntoSteps` is a port of eas-cli's grouping. It keys lines by `buildStepId ?? buildStepDisplayName ?? phase`, takes each step's result from its `END_PHASE` / `end-step` marker, counts warnings (level 40) and errors (level 50), and measures duration from first to last timestamp. Phase names come from `@expo/eas-build-job` (copied, not bundled).

The viewer (`src/components/log-viewer.tsx`) flattens steps into header and line rows for FlashList, with collapsed steps contributing only a header. Failed and running steps open by default. Search steps through matches across all steps and expands the step that holds the current match. Phase chips jump to a step. Each step can be copied on its own.

An expired signed URL (403/404) triggers one re-query of the parent for fresh URLs.

### Live streaming

Running builds and workflow job runs stream new lines from Expo's Centrifugo server (`wss://logs.expo.dev/connection/websocket`), as `eas build` and `eas workflow:logs` do. `src/api/realtime.ts` holds one connection per session. Its connection token and each per-target subscription token come from the `realtimeLogs` GraphQL mutations, so the personal access token only ever goes to api.expo.dev. Subscriptions are ref-counted per target. The build screen, its logs screen and the Now hero share one stream and one `LogsState`.

`LogsState` (`src/api/log-state.ts`, ported from eas-cli) merges file lines and streamed lines by `logId`. Streamed lines stay hidden until a file fetch overlaps them, so there's never a gap. `useLogs` schedules that catch-up fetch 2.5 s after the first hidden line arrives, throttles re-renders to one per 300 ms, and slows file polling to once a minute while the stream is live. Streaming runs only while the screen is focused, the app is in the foreground and the job is active. It reads the final file once more when the job ends, and closes on sign-out. Submissions have no realtime target and keep polling at the refresh interval. The viewer follows the newest line until the reader scrolls, then offers "Follow live".

Phase lamps come from the same steps (`phasesFromSteps`). Known EAS build phases collapse into at most seven named groups. Custom steps (workflow jobs) show one lamp per step, windowed around the failure. List rows can't afford a log download per row, so they use `statusLamps`: three generic stages that never claim a specific phase.

## Mutations and confirmation

Every production-impacting or destructive change goes through `ConfirmSheet` (`src/components/confirm-sheet.tsx`). The sheet shows the exact account or project, channel, branch and UDID, the before → after values, and a split bar with the change drawn as a striped segment. The safe option is the secondary button, and errors from Expo are shown inline. Channel branch-mapping JSON is parsed and written by `src/lib/branch-mapping.ts`, which matches eas-cli's rollout format: `hash_lt` on `rolloutToken`, operand as a fraction, optionally ANDed with a runtime-version constraint. Mappings Kiln can't parse are shown as "custom" and are read-only.

## Data minimization

Kiln persists no query responses. Tokens, signed URLs, logs, environment-variable values, credentials and private keys never reach the preference store. Environment-variable queries don't request `value`. Log queries have a 60-second `gcTime`.

Now and Activity read the six most recently active projects (Expo's `LATEST_ACTIVITY_TIME` sort) and the first page of builds, submissions, update groups and workflow runs for each. They never page through history. Sources that fail for a token are counted and noted, not fatal.
