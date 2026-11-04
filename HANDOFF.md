# Handoff prompt: build Kiln (unofficial EAS mobile client)

> Paste everything below the line into a fresh Claude Code session opened at `/Users/aiken/repos/projects/expo-mobile`. It is self-contained.

---

You are implementing **Kiln**, a complete, functional mobile client for Expo Application Services (EAS), in the existing Expo project at `/Users/aiken/repos/projects/expo-mobile`. The visual and interaction design is finished and **binding**. This prompt defines what to build, how it must behave, and where the design lives. Inspect the workspace and the official sources, then implement. Make reasonable decisions on your own, and keep going until the feasible functionality is complete. Do not stop after the first dashboard.

## 0. Read first (in this order)

1. `AGENTS.md` in the repo: Expo rules. pnpm project: use `pnpm exec expo install`, never `pnpm add`, for SDK-compatible packages. Routes live in `src/app/`; non-route code lives outside it. Never hand-edit `ios/` or `android/`.
2. `design/DIRECTION.md`: tokens (colour roles light and dark, type steps per platform, spacing, radii, depth), the lamp-row richness system, the signature interaction, the voice rules, and the content fixture.
3. `design/mockup.html` (the source of truth) plus the final renders in `design/shots/r3/` (small phones: `design/shots/r3-small/`), and `design/CRITIQUE.md`. Implement its "Open" items too: an Account health lamp row, lamp strips and split bars on Activity rows, and a collapsing Android Builds app bar. The renders are the visual spec, and `design/shots/<round>/pairs/*.png` shows each iOS and Android pair.
4. Before writing any code against an Expo, EAS or React Native API: read `package.json` (currently `expo ~58`, RN 0.88, React 19.3, TS 6). Then fetch `https://docs.expo.dev/versions/v58.0.0/` and `https://docs.expo.dev/llms.txt`. Never answer from memory.

## 1. Product goal

Developers view and manage as much of their Expo account as the APIs allow: projects, builds, submissions, OTA updates, branches and channels, workflows, hosting, environment-variable metadata, devices, and account resources. It must be a real app connected to real Expo APIs, with management actions next to viewing. It is not a mockup or a read-only proof of concept. Users authenticate with **their own Expo personal access token**. There is no separate app account, and no shared token or server secret is ever shipped.

## 2. Research and capability discovery (do this before implementing features)

Inspect the current official Expo docs and the `expo/eas-cli` source (GitHub: `expo/eas-cli`, especially `packages/eas-cli/src/graphql/` with its generated schema types, queries, mutations and fragments, plus `src/build`, `src/submit`, `src/update`, `src/channel`, `src/branch`, `src/worker`, `src/env`, `src/devices`, `src/workflow`). Verify:

- Authentication: how a personal access token or robot token is sent (the header name and format), the GraphQL endpoint (`https://api.expo.dev/graphql` as used by eas-cli; confirm), how to fetch the current actor and its accessible accounts, and how restricted tokens and roles surface.
- GraphQL queries, mutations, fragments and types for every feature below, with pagination (connection/cursor or offset/limit, whichever each field really uses) and filters.
- Official REST APIs, if any are relevant.
- Logs: build log files (eas-cli reads `build.logFiles` URLs and parses JSONL lines with phase markers; confirm), workflow job logs, and their expiry.
- Artifacts: application archive URLs, install links, and internal-distribution install pages.
- Which actions require source code, repository/GitHub integration, credentials already stored on Expo (for example ASC API keys or Google service accounts for submit), or a backend.

**Never invent endpoints, operations, fields or capabilities.** If a field can't be verified, don't ship UI for it: show an explicit "Open in Expo" link instead.

Keep `docs/CAPABILITIES.md` up to date: a matrix with one row per feature or action and these columns: *implemented*, *unsupported*, *needs repo configuration*, *needs backend*, *token or role restriction*, *verified against a live account (yes/no)*, *source (doc URL or eas-cli file and line)*.

## 3. Technology

- Latest stable, mutually compatible Expo SDK, React Native and TypeScript (the repo is on SDK 58; upgrade only if a newer stable SDK exists and the upgrade is clean).
- **NativeWind** for styling. Map every token from DIRECTION.md into the Tailwind config as CSS variables with light and dark sets. No hex values in components.
- **Expo Router**: platform-native tabs (the native tabs API for SDK 58; check its current import path and options) plus a native stack per tab. On iOS this gives the Liquid Glass tab bar; on Android, the Material navigation bar.
- **TanStack Query** for server state, pagination (`useInfiniteQuery`), caching and mutations.
- **react-native-mmkv** (Margelo, the current major version with its required `react-native-nitro-modules` peer) for storage.
- **expo-secure-store** for the MMKV encryption key, and **expo-crypto** for secure random key generation.
- Also expected: `expo-glass-effect` (iOS glass), `@expo/ui` (native switches, pickers, segmented controls and menus per platform), `expo-symbols` (SF Symbols on iOS), Material Symbols on Android, `expo-haptics`, `expo-clipboard`, `expo-sharing` or RN `Share`, `expo-web-browser`, `react-native-reanimated` (already present), `@shopify/flash-list` or `FlatList` for virtualization, and `@react-native-community/netinfo` for offline detection. Keep dependencies minimal, and **do not bundle the Node-oriented EAS CLI**.
- This must run as an **Expo development build** (`pnpm exec expo run:ios` / `run:android`, or `eas build --profile development`). Don't assume Expo Go works. Add an `eas.json` with a `development` profile.

## 4. Authentication and storage (security-critical)

- Token entry with an optional visibility toggle, and a link to Expo's access-token settings page (confirm the URL; it is under expo.dev account settings).
- **Validate before persisting**: query the current actor. Only on success, store the token and discover accessible accounts. Support restricted tokens: an empty account list or limited roles must be explained, not crash the app.
- Distinct, clear errors for an invalid or revoked token, insufficient permissions, a network failure, and a server error.
- Token replacement, a connection test (show the round-trip time), persistence across restarts, and logout.
- **Encrypted MMKV instance just for the token.** Generate a random key with expo-crypto in the format and length the installed MMKV version accepts (check its docs; v4 changed the API). Store the key only in expo-secure-store, using `WHEN_UNLOCKED_THIS_DEVICE_ONLY`-class accessibility so it is excluded from backups and device transfer. Load the key *before* creating the encrypted instance or restoring the session. Never hardcode the key or store it in MMKV.
- A **separate, unencrypted MMKV instance** for non-sensitive preferences (appearance, refresh interval, favorites, recently viewed, selected account ID).
- **Recovery:** if the key is missing (for example after restoring a backup to a new device) or the encrypted store can't be read, do **not** silently create a new key over existing encrypted data. Wipe that MMKV instance explicitly, then show sign-in with a one-line explanation. Make sure the Android `allowBackup` and backup rules (via an app.json or config plugin) exclude the MMKV files.
- Tokens never appear in logs, analytics, route params, error reports or persisted query caches. Add a redaction helper used by every error path.
- **Logout:** cancel in-flight requests and polling (`queryClient.cancelQueries`, and abort controllers in the transport), clear the query cache and account-specific preferences, delete the token, wipe the encrypted instance and delete its key, and bump a session epoch. Responses tagged with an older epoch are discarded, so late responses can't restore data from the previous session.

## 5. API architecture

- `src/api/transport.ts`: a fetch-based GraphQL client with bearer auth, `AbortController` support, a timeout, and retry with backoff and jitter for transient errors (5xx, network, 429 honoring `Retry-After`). It never retries 401/403 or authorization GraphQL errors. It handles **GraphQL errors returned with HTTP 200**, including partial data plus errors. Requests are tagged with the session epoch.
- `src/api/errors.ts`: a typed, normalized error union (`unauthenticated | forbidden | notFound | rateLimited | network | timeout | server | graphql(partial)`) with user-facing copy written in the voice (§9).
- `src/api/documents/*.ts`: verified GraphQL documents and hand-written or codegen'd TypeScript types. Record provenance in each file header (the eas-cli file or doc URL, plus the date checked). Keep internal or unofficial schema dependencies isolated here so schema changes are fixed in one place. The docs must not imply that these APIs have a public compatibility guarantee.
- `src/api/services/<domain>.ts`: builds, submissions, updates, branches, channels, workflows, hosting, env, devices, accounts.
- `src/api/keys.ts`: query-key factories that **always include accountId and projectId** where relevant.
- `src/api/hooks/*`: reusable query and mutation hooks, pagination helpers, and capability/permission helpers (derived from role plus the server's answers; server-side authorization is authoritative).
- Only fetch artifact and log URLs **without** the Expo bearer token. Never forward the token to a non-Expo host, and never follow redirects to an unrelated host with the token attached.
- If adapting eas-cli code, respect its MIT licence and record provenance in a comment.

## 6. Navigation (as designed)

Native tabs: **Now · Projects · Activity · Account**, plus search (on iOS, the separate glass search button next to the tab bar via the native tabs search role, if SDK 58 supports it; on Android, a search icon in the top app bar). Each tab has its own native stack. Account switching happens in a sheet opened from the account pill or chip at the top-left of root screens. Sign-in is a separate route group shown when there is no valid session.

## 7. Pages and features

Implement each one where the API supports it. Everything visible has to work. Explicitly labeled "Open in Expo" fallbacks are acceptable.

1. **Sign in.** Explain token access briefly (`sign-in.png`). Validate with the stepped progress state (`sign-in-checking.png`: token accepted → accounts found → loading account → saved). Restore the session on launch, and handle expired or revoked access by returning here with the reason.
2. **Now (overview)** (`now.png`, `now-android.png`, `now-light*.png`, `now-empty.png`). The hero is the most relevant active build: elapsed clock, phase lamps, commit. Below it come **Needs a look** (recent failures with their error excerpt), **Also running** (queued builds with queue position and estimated wait if the API exposes them, and running workflow runs), **Recent** (updates, finished builds, submissions), and favorite and recently viewed projects. Only show metrics that can be computed accurately from a small number of queries.
3. **Account selection** (`accounts.png`). Personal and organization accounts with role and metadata. Switching is persisted. Removed memberships and revoked access are handled.
4. **Projects.** A paginated list with search, account filtering, favorites (starred, as in `project.png`'s toolbar), recently viewed, and project identity metadata.
5. **Project hub** (`project.png`). Overview and metadata, the production channel rollout split, and rows for Builds, Submissions, Updates, Branches and channels, Workflows, Environment variables, Devices, Hosting and Settings, each with a live summary value. Add "Open in Expo". Hide or explain sections the API or the role doesn't allow.
6. **Build history** (`builds.png`, `builds-android.png`). Paginated, with filters the API supports (platform, status, profile, distribution, project) shown as chips. Rows carry a mini lamp row. Pull to refresh.
7. **Build detail** (`build-failed*.png`, `signature-*.png`). Status and phases (lamps, derived from log phases; fall back to status-only if logs are unavailable), queue info, platform, distribution, profile, app version and build number, runtime version, git commit, message and branch, initiator, timestamps and duration, the error, related submissions and workflow runs, artifacts and official install links, and the Expo dashboard link. **Actions:** cancel (queued or running), retry or rebuild (only if a verified mutation exists), submit an eligible build (only with credentials already configured on Expo; never ask for Apple or Google credentials), and share details or artifact links. Don't pretend a source build can be created from metadata. New source builds go through a verified workflow dispatch or repository-backed trigger, and the required configuration is surfaced.
8. **Logs** (`logs.png`). Real log retrieval, streamed or incremental where supported, otherwise chunked and virtualized line by line (never one giant string). Phase chips to jump between phases. Search with match stepping. Copy and share. Refresh while the build is active. Handle expired URLs (re-query the build for fresh URLs) and unavailable logs.
9. **Submissions.** Paginated, with platform and status filters, detail view, associated build, timestamps, errors and logs, dashboard links, submitting an eligible build, and retry or cancel only if verified. Always distinguish EAS upload status from Apple or Google review ("Uploaded to App Store Connect. Apple review isn't tracked here.").
10. **OTA updates.** Paginated updates and update groups, platform and runtime-version filters, message, timestamps, commit, rollout metadata, related branches and channels, and group detail. Republish, rollback or rollout changes only where a verified mutation exists. Publishing a new JS bundle is out of scope unless it runs through a configured workflow.
11. **Branches and channels** (`channels.png`, `rollout-confirm.png`). List and inspect them, show channel → branch mappings as split bars, create, rename and delete branches and channels, change mappings and rollout percentages. **Every production-impacting change uses the confirmation sheet** (`rollout-confirm.png`: display-size before → after, a hatched segment for the delta; show an install or launch count only if a verified API such as update insights provides it) with the exact account, project, channel, branch and before → after values, and the safe option as the secondary button.
12. **Workflows.** Configured workflows, paginated runs, run detail and inputs, jobs with status, timestamps, errors and logs, related builds, submissions and updates, triggering a configured workflow with its supported inputs, and cancel or rerun where verified. Prefer workflows for any remote operation that needs repository context.
13. **Hosting.** Deployments, their details and status, URLs, aliases and targets, metadata and logs, and supported alias or deployment actions.
14. **Environment variables.** Names and safe metadata only, an environment filter, visibility and scope. **Never** automatically fetch, reveal or persist secret values. Never fetch signing credentials or private keys. Management operations only where verified and appropriate.
15. **Devices and internal distribution.** Registered devices, their details and registration state, registration links, internal builds, official install links, and supported device actions. Respect platform install restrictions (for example, a store-distribution iOS build has no install button).
16. **Account resources.** Team members and roles, account and project settings, usage and quotas, billing summary, and webhook configuration, *only where an API exists*. Read-only stays read-only; never imply management access.
17. **Activity** (`activity.png`). A unified feed from builds, submissions, updates and workflows (and deploys if available), merged client-side from a bounded number of recent pages per source, sorted by time. Filters: project, event type, platform, status. State the window it covers ("Last 7 days across 4 projects"). Never fetch an account's whole history to build it.
18. **Account / settings** (`settings.png`). Identity, active account, accessible accounts, replace token, connection test, appearance (System/Dark/Light), refresh interval, favorites management, clear cached data, notification settings (shown as "Needs a Kiln server you run. Not set up." unless the optional backend is configured), app version, the unofficial-client disclosure, and sign out.

Screens that weren't individually designed (submissions, updates list and group detail, workflows, hosting, env vars, devices, members, project settings, search) **reuse the designed patterns**: the large title, chip filters, rows with a status mark and a mini lamp row, inset grouped facts on iOS, Material list items on Android, and the confirmation sheet. Keep their copy in the voice.

## 8. Design implementation rules (from DIRECTION.md; binding)

- Dark is the default appearance. Light is a second designed palette. Colour roles: ground, raised, raised-2, ink, ink-2, ink-3, rule, lamp-off, lamp-done, **live (sodium amber, running or queued only)**, **alarm (red, failed or destructive)**. **Success is quiet grey, never green.** The system tint is ink. Primary buttons are ink capsules with ground-coloured text.
- Type: the iOS display face is SF Pro Compressed Heavy (`fontWidth` compressed is unavailable in RN, so bundle a static compressed instance only if licensing allows; otherwise use the closest system API, and **ask the user** before substituting). On Android, use Roboto Flex at wdth 25, wght 800, as a static instance via expo-font. UI text is the system face on iOS and Google Sans Flex on Android. Mono (SF Mono / Roboto Mono) is only for hashes, errors, logs and phase times. Every changing number uses tabular figures.
- The **lamp row** component (`<PhaseLamps phases size="hero|row|mini" />`) is the richness system. States: off (outlined), done (grey), live (amber with a top highlight), failed (red), flash (white).
- **Signature:** the approach-light sweep in DIRECTION.md. Phase change: an effects fade plus a snappy spring on the next lamp, with a selection haptic. Finish: a left-to-right white flash at a 40ms stagger (about 420ms), then settle to grey; the clock rolls to the final duration; success haptic (`notificationAsync(Success)` on iOS, Android `Confirm`). Failure: the lamp turns red and the error drops in, with an error/`Reject` haptic. With reduced motion, colours change in place and the haptics remain.
- iOS uses real Liquid Glass (`expo-glass-effect`) only on the toolbar buttons and pills, the tab bar, the search button and sheets. **Android uses simulated glass** on the navigation bar and top app bar (a translucent tonal surface with blur where supported, falling back to solid tonal), with Material grammar: a 64dp top app bar with a back arrow, a 64dp navigation bar with a pill indicator, Material Symbols, an extended FAB for the screen's one primary action (for example "Retry build"), 48dp targets, no chevrons on list rows, and edge to edge.
- 44pt / 48dp targets, screen-reader labels on every status mark and lamp ("Run fastlane, running, 1 minute 44"), and Dynamic Type / font scaling that reflows instead of truncating.

## 9. Voice (binding for all copy)

The release engineer at the next desk: terse, exact, calm. (1) Names and numbers, not adjectives: "Failed in Run gradlew after 4:31". (2) EAS status words in sentence case; durations as m:ss; relative under 24 h, dates after. (3) Every limit says why and what to do: "This token can't cancel builds on lumen-labs. Ask an owner, or open it in Expo." No "we", no exclamation marks, no emoji, no "Oops" or "Something went wrong".

## 10. Refresh, caching, offline

Pull to refresh everywhere. Poll active builds, jobs and workflow runs **only while their screen is focused and the app is foregrounded** (`useFocusEffect` plus `AppState`, wired into TanStack `focusManager` and `onlineManager`). Stop polling when a job reaches a terminal state. Pause when offline. Back off on failures and respect rate limits. Show cached data with its last-update time, and keep existing content when a background refresh fails. Don't retry auth or permission errors indefinitely. Don't persist sensitive responses or signed URLs. If you add cache persistence, persist only non-sensitive shapes and never artifact or log URLs.

## 11. Mutations

For every action: check token permissions and resource state, and treat the server's answer as authoritative. Explain unavailable actions in the voice. Prevent duplicate submits. Show pending, success and failure states, and invalidate related queries on success. Use optimistic updates only where they're safe (favorites, for example). Use the confirmation sheet for destructive or production-impacting operations, with their exact scope. **No non-functional controls.**

## 12. Notifications (optional backend)

The core app works directly against Expo with no backend. Foreground polling is never described as background monitoring. If feasible, add `server/` as a separate optional backend (for example Expo Router API routes deployable to EAS Hosting, or a small Node service). It should:
- register Expo push tokens with the user's consent,
- associate subscriptions with projects the user is authorized for (verified server-side with the user's token at subscribe time; the token is never stored longer than needed),
- receive EAS build/submit webhooks and verify their signatures (confirm the header and algorithm in the docs or eas-cli `webhook` code),
- deduplicate deliveries,
- remove subscriptions on logout,
- keep all secrets server-side.

If it can't be deployed or configured here, document exactly what remains, and keep the setting showing "Not set up".

## 13. Verification and delivery

Run `pnpm exec tsc --noEmit` and `pnpm exec expo lint` (both must pass), plus `pnpm dlx expo-doctor`. Add unit tests for the pieces that don't need a token: token store init/recovery/logout and session-epoch discarding, error normalization (including HTTP 200 with GraphQL errors and partial data), redaction, query keys, pagination helpers, and polling stop conditions. Build development builds for iOS (simulator) and Android (emulator) if the tooling allows. Screenshot the main screens and compare them with the mockups pair by pair. **If no Expo token is available, implement the real integration anyway and clearly list every authenticated flow that wasn't verified. Don't claim untested flows were tested.**

Deliver:
- the complete source,
- `README.md` with development-build setup and run instructions,
- `docs/ARCHITECTURE.md`,
- `docs/CAPABILITIES.md` (the matrix),
- `docs/API-PROVENANCE.md` (with compatibility notes and the unofficial-API caveat),
- `server/README.md` if the backend exists,
- a final list of genuine limitations and unverified flows.

Ask the user before delegating any part of this work to another agent or model. Their global policy requires asking first.
