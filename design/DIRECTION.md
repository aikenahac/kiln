# Kiln — design direction

## Brief

1. **What / who:** an unofficial, free mobile client for Expo Application Services. For developers and small teams who ship Expo apps and want to see and manage builds, submissions, OTA updates, workflows, hosting and account resources from their phone, authenticated with their own personal access token.
2. **Core action (first ten seconds, every day):** "Did my build/workflow pass, and if not, why?" Then: did the OTA update reach production.
3. **Platforms:** iOS and Android, built in Expo (SDK 58, RN 0.88, Expo Router native tabs). Explore on **iPhone** first; every core screen gets an Android pair.
4. **Feel:** premium, Expo-like, native. Liquid Glass chrome on iOS (real `expo-glass-effect`), a simulated glass/tonal navigation layer on Android. References: none given beyond the Expo ecosystem itself.
5. **Money:** free. No paywall.
6. **Voice:** self-authored (user said "you pick").
7. **Exists already:** fresh Expo SDK 58 template; no name, logo, colours or fonts. Must not borrow Expo marks (unofficial client).
8. **Scope:** (a) three directions on the core screen → user confirms → all screens → handoff prompt for implementation.
9. **Image generation:** never. All imagery drawn in code (SVG/CSS).

**Proposed name:** **Kiln** — builds get *fired*: queued, in the kiln, out of the kiln, or cracked. Short, ownable, not an Expo mark. Alternates: *Hangar*, *Dispatch*.

## Category default refused

Dev-tool mobile clients (GitHub Mobile, Vercel, Bitrise, Codemagic, Expo's own dashboard) share: near-black or white monochrome, Inter/Geist everywhere, green-check / red-X rows in one long list, a "Recent builds" table squeezed onto a phone, terminal-mono costume, and the hacker palette (neon green, cyan, purple). The colour cliché is **green = passed, red = failed on every row**. We refuse: the list-of-checkmarks dashboard, success painted green, mono for everything, and purple.

Every direction below keeps: success is quiet (ink), only *live* and *broken* get colour.

## Three concepts

- **A. Tower** (`place`): "Kiln is a control tower at night." Dark, SF Pro Compressed numerals + SF Mono seasoning, sodium-amber for *live*, phase lanes as runway lamps.
- **B. Glaze shelf** (`object`): "Kiln is a ceramics studio shelf." Light porcelain ground, SF Pro Expanded display, every project owns a glaze colour (identity palette), the running build is a glossy fired object.
- **C. Tide chart** (`nature`): "Kiln is today's tide chart." Colour-field ground that *means* the account state (cobalt = quiet, kiln red = something broke in the last hour), SF Pro Rounded heavy, the day's builds drawn as a tide.

**Chosen by the user on 2026-11-03: A. Tower.**

## Exploration result (round 1, `shots/explore/sheet.png`)

**Recommended: A. Tower**, pending the user's confirmation.
- Closest to "premium, Expo-like, native": black and white with one signal colour, and Liquid Glass reads best over the dark ground. The hero is the live build's elapsed clock with lit phase lanes, which answers the core question ("is it passing, where is it") in one glance.
- Success stays quiet (grey lamps); only *live* (sodium amber) and *broken* (red) get colour.
- Light mode becomes its own design (porcelain ground, amber deepened for text), not an inversion.
- Possible merge from B: every project owns a small glaze token (an identity colour) for its avatar. This only counts as identity if it stays off the status colours.

**B. Glaze shelf** lost (provisionally): the most premium surface finish, but the kiln copy ("cracked", "out of the kiln") turns cute after a week, and the identity palette competes with status colour.
**C. Tide chart** lost (provisionally): the boldest of the three, and the field's colour carries meaning, but a screen that turns red is alarmist for a failed preview build. It is the least Expo-like, and the tide chart is decoration more than information.

Scan: 0 real FAILs. The one FAIL left (C, "L" avatar) is a false positive: the scan measured against the glass, but the disc is solid #5E1508 with white text (≈13:1).
Provisional history row claimed: place / dark / condensed (SF Pro Compressed) / orange / shape.


---

# The direction: Tower

**Concept:** "Kiln is a control tower at night." Builds are the aircraft. Queued ones are holding, the running one is lit, finished ones go dark, and the one that broke stays red until someone looks at it.

**Name:** Kiln (open for the user to change; *Hangar* fits the tower concept even more closely). Unofficial: no Expo marks, no "Expo" in the app name. In-app copy says "Expo" only when naming the service.

## Colour (identity is one signal colour on black, plus one alarm)

| Role | Dark (primary) | Light | Notes |
|---|---|---|---|
| ground | `#0A0B0D` | `#F3F3F0` | near-black with a blue-grey cast; light is cool porcelain, not cream |
| raised | `#15171B` | `#FFFFFF` | sheets, grouped lists, inputs |
| raised-2 | `#1E2025` | `#ECECE8` | fields, pressed rows, chips |
| ink | `#F2F1EC` | `#111214` | |
| ink-2 | `#A9ABB0` | `#53565C` | secondary, measured ≥ 7:1 / 6.9:1 |
| ink-3 | `#8A8D94` | `#666A71` | tertiary, ≥ 4.5:1 on ground |
| rule | `rgba(242,241,236,.09)` | `rgba(17,18,20,.09)` | hairlines 0.5pt |
| lamp-off | `#24272D` | `#E2E2DE` | a phase not reached yet (outlined) |
| lamp-done | `#3A3D44` | `#C9CAC5` | a finished phase: quiet |
| **live** | `#FFB238` fill / `#FFC566` text | `#F5A524` fill / `#8F5200` text | **sodium amber, one role: running or queued.** Never on buttons or tabs except the selected tab tint |
| **alarm** | `#FF6152` fill / `#FF9A8F` text | `#D23A2A` | failed or errored, and destructive confirmations |
| on-live | `#1A1205` | `#1A1205` | ink on an amber fill |

- **Success is quiet:** finished = `lamp-done` grey square plus the word "finished". No green anywhere.
- **System tint = ink** (white in dark, near-black in light). Amber is a *state*, not the action colour (color.md §3). Primary buttons are ink-filled capsules with ground-coloured text.
- **Dark is the default appearance.** Light mode is a second design, not an inversion. Setting: System / Dark / Light.
- Android: own scheme from these roles (surface = ground, surfaceContainer = raised, primary = ink, tertiary = live, error = alarm). Dynamic colour is off; it would erase the signal colour.

## Type

| Step | iOS | Android | Use |
|---|---|---|---|
| clock | SF Pro Compressed (wdth 60) Heavy 104 / 0.9, −2 | Roboto Flex wdth 25 wght 800 104 | the live elapsed time on Now. One per app screen |
| display | SF Pro Compressed Heavy 56 / 1.0, −1 | Roboto Flex wdth 25 wght 800 56 | durations and counts on detail screens |
| title | SF Pro Bold 34 / 41 (large title) | Roboto Flex wght 700 32 (large top app bar) | screen names |
| heading | SF Pro Bold 22 / 28, −0.3 | Roboto Flex 700 22 | sections, entity names |
| body | SF Pro Semibold/Regular 17 / 22 | Google Sans Flex 16 / 24 | rows |
| meta | SF Pro Regular 13 / 18 | Google Sans Flex 14 / 20 | supporting text |
| lamp | SF Pro Semibold 11 / 13; SF Mono 11 for times | Roboto Flex 600 11; Roboto Mono 11 | phase labels |

- Mono (SF Mono / Roboto Mono) only for commit hashes, error excerpts, log lines and phase times. It's a seasoning, not a costume.
- This is the one deliberate "native, sharpened" exception to "one display face on both": SF Pro cannot ship on Android, so each platform uses its own compressed system face at the same metrics. Roboto Flex wdth 25 is the closest match.
- Tabular figures on every number that changes.

## Space, shape, depth

- Margin 20 (iOS) / 16 (Android). Scale 4 8 12 16 20 24 32 40 48 64.
- Radii: lamps 6, chips and fields 12, grouped lists 26 (iOS) / 16 (Android), sheets 38 iOS / 28 Android, buttons as capsules.
- Depth: ground → raised lists and sheets (dark: lighter, no shadow) → floating glass. iOS uses real Liquid Glass (`expo-glass-effect`) on the toolbar, tab bar, search and sheets only. **Android (the user's call):** a *simulated* glass navigation bar: a translucent tonal surface (`ground` at 78% + 24dp blur where supported, solid tonal fallback), with Material structure (64dp bar, active pill indicator, Material Symbols, FAB, back arrow).

## Richness source: the lamp row

Build phases drawn as a row of runway lamps: one rounded bar per phase, outlined = not reached, grey = done, **amber = running now**, red = failed here. The lamp row appears everywhere a build appears: big on Now and build detail, as a 4pt mini-row on list rows, as the app icon. It carries real information (phase names and durations come from the build's JSONL log phases) and is never decoration. It also appears as the rollout split on channels: two lamps whose widths are the branch percentages.

## Signature: the approach-light sweep

- **Trigger:** a polled build moves to a new phase or finishes while its screen is visible.
- **Phase change (each step):** the lit lamp fades amber → grey (effects spring, 180ms) and the next lamp lights (iOS `.snappy`, Android spatial fast); haptic `.selection` / `SEGMENT_TICK`.
- **Finished:** the row sweeps white left to right, one lamp every 40ms (6 lamps ≈ 420ms), like approach lights, then settles to grey. The clock stops and rolls to the final duration (`numericText`), and "Install on this iPhone" rises in. Haptic `.success` / `CONFIRM`.
- **Failed:** the lit lamp turns alarm red and stays; the error excerpt drops in under the row; haptic `.error` / `REJECT`. No sweep.
- **Reduced motion:** colours change in place, no sweep, no roll; haptics stay.

## Voice

The release engineer at the next desk: terse, exact and calm, and has seen every Gradle error.
1. **Names and numbers, not adjectives.** "Failed in Run gradlew after 4:31", never "Oops, something went wrong".
2. **EAS's own status words, in sentence case:** queued, building, finished, failed, canceled. Durations as m:ss; relative times under 24 h ("22 min"), dates after that.
3. **Every limit says why and what to do.** "This token can't cancel builds on lumen-labs. Ask an owner, or open it in Expo." No "we", no exclamation marks, no emoji.

## Content (shared fixture for every screen)

- Account **lumen-labs** (organization, role: developer). Personal account **maja.k**.
- Projects: **Trailhead** (`@lumen-labs/trailhead`, favorite), **Pocket Ledger**, **Fieldnote**, **Sprout Kiosk** (web, hosting).
- Running: Trailhead iOS production 2.4.0 (318), runtime 2.4.0, resource class large, commit `a3f9c21` "Fix map tile cache on cold start", maja.k on main, 6:12 of about 11 min, in Run fastlane (step 5 of 6).
- Queued: Trailhead Android production, 2nd in queue, about 3 min.
- Failed: Pocket Ledger Android preview 1.9.2 (77), failed in Run gradlew after 4:31, `Execution failed for task ':app:mergeReleaseResources'`, `AAPT: error: resource color/brand_ink not found`, commit `7d01be4` "Rename brand colours" by teo.r on feat/theme.
- Update: "Hotfix: offline banner copy", branch hotfix-offline-banner → channel production at 25% (75% stays on production branch), runtime 2.4.0, iOS + Android, 38 min ago by maja.k.
- Workflow: deploy-production #142, building · 3 of 5 jobs.
- Finished: Fieldnote iOS development, finished in 14:08, 1 h ago.
- Hosting: sprout-kiosk.expo.app, production alias, deployed 2 h ago.

## Category default refused (recap)
No green success, no checkmark lists, no hacker palette or terminal costume, no purple, no dashboard grid of stat tiles.
