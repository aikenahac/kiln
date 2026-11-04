# Kiln: critique log

One critic for the whole job (critique.md). Scores 1–5; lines 13–14 out of scope (no reels, no paywall).

## Round 1 (`shots/r1/`)

| # | Line | Score |
|---|---|---|
| 1 | Concept | 4 |
| 2 | Not category average | 4 |
| 3 | Not skill average | 3 |
| 4 | Hierarchy | 4 |
| 5 | Typography | 4 |
| 6 | Colour | 4 |
| 7 | Richness and joy | 3 |
| 8 | Rhythm and space | 4 |
| 9 | Finish and craft | 3 |
| 10 | Native fluency (Android counts) | 3 |
| 11 | Signature | 4 |
| 12 | Copy | 3 |
| 15 | Feature test | 3 |

Not done: 62% of lines at 4 or above, and lines 9, 10 and 12 at 3.

### Changes made for round 2
- **Android icon:** marks absolutely centred in every layer. The masks and the themed icon were blank because the kit forces `display:block` on the mono layer, which broke the grid centring.
- **Android grammar:**
  - Builds is now a pushed screen under Now, with a back arrow on both platforms. That fixes the tab/title mismatch.
  - Chip rows fade at the edge instead of clipping.
  - build-failed-android: the extended FAB is now "Open log at error", and Retry is a tonal button.
  - New `project-android`: 72dp list items with leading Material Symbols and supporting text, no chevrons.
- **Lamp finish:**
  - Lit and failed lamps get a downward shadow in their own colour (finish.md recipe; not a zero-offset glow).
  - Done lamps get a 1pt top highlight, so they read as spent rather than disabled.
- **Project hub:** the hero is now a "Rolling out on production" eyebrow, a 56pt "25%" and "on hotfix-offline-banner" over the lit split bar. The "6 · 3" row is split into Channels ("1 rolling out") and Branches ("6").
- **Avatars:** rounded-square monogram tiles in three graded ink tones with a 1pt rim.
- **Sign-in:** the field and link moved up under the subhead (no dead gap). The lamps are labelled Paste / Check / Accounts / Save, and the checking screen uses the same labels.
- **Signature:** added `signature-3`, the failure beat: red 4:31 "in Run gradlew", the red lamp, the error excerpt, then Open log / Retry.
- **Small phones:** the clock unit is hidden under 380pt width, so "min" no longer strands.
- **Copy:**
  - Channels subtitle → "each channel and the branch it serves".
  - Rollout → "25% · rolling out".
  - "Every 15 seconds".
  - Notifications row → "Set up ›".
  - Submit note → "Review status lives in App Store Connect."
  - Lamp label "Gradle" → "Gradlew".
  - Upload placeholder "–:––" → "not run".

### Declined
- **6 lamps on the Android builds rows:** Android builds really have 5 phases (no Pods). The list is filtered to Android, so 5 matches the Android detail screen. Lamp count is information.
- **Horizon or runway illustration on the empty state and sign-in:** this would be decoration with no data behind it. The labelled lamp steps carry the concept instead (finish.md §8.1, "give every decoration a job").
- **Abbreviated lamp labels ("Fastlane", "Gradlew") versus full EAS phase names in status lines:** kept. Full names don't fit at 11pt across 6 lamps; status lines and log chips use EAS's exact names.

## Round 2 (`shots/r2/`)

| # | Line | R1 | R2 |
|---|---|---|---|
| 1 | Concept | 4 | 4 |
| 2 | Not category average | 4 | 4 |
| 3 | Not skill average | 3 | 3 |
| 4 | Hierarchy | 4 | 4 |
| 5 | Typography | 4 | 4 |
| 6 | Colour | 4 | 4 |
| 7 | Richness and joy | 3 | 3 |
| 8 | Rhythm and space | 4 | 4 |
| 9 | Finish and craft | 3 | 4 |
| 10 | Native fluency | 3 | 4 |
| 11 | Signature | 4 | **5** |
| 12 | Copy | 3 | 4 |
| 15 | Feature test | 3 | 4 |

**Done by the stop rule:** no line below 3, 85% of lines at 4 or above, and lines 1, 9, 10 and 12 all at 4 or above. All round 1 asks landed or were accepted as declined.

### After done: concrete defects fixed in `shots/r3/` (not re-scored)
- signature-3: "in Run gradlew" moved into the eyebrow, so small phones no longer show a bare "4:31".
- Mini lamp strips: 6pt tall, lit segments with a same-colour 2pt shadow, done segments with a highlight.
- Light mode: amber text `#875A00` is now the same hue as the lamp.
- iOS build-failed: the key/value tables became two-line Source and Build rows, matching Android.
- rollout-confirm: "25% → 50%" in the 56pt display face, the added share drawn as a hatched amber segment, and the redundant Change row removed.

### Open (the critic's next asks, left for the build)
- Lines 3 and 7 (3/5): Account and Activity still read as plain lists. Proposed: a 3-lamp health row on Account (Token / Connection / Notifications), and mini lamp strips plus split bars on Activity rows.
- Android Builds: a medium flexible top app bar that collapses on scroll, and filter chips without carets.
- **Declined:** "About 4,200 installs" in rollout-confirm. Kiln can't show an install count unless a verified EAS API (for example update insights) provides it. The handoff tells the implementer to show it only if verified.

## Activity filter row (2026-11-04)

Four stacked chip rows became one row: `Type ⌄` and `Project ⌄` menu pills plus Platform and Status icon filters that open native menus (`src/components/filter-menu.tsx`). Renders: `shots/activity-r2/`, `shots/activity-r3-small/`.

Critic scores: hierarchy 4, stranger clarity 2, colour roles 3, touch and native feel 4, edge cases 2.

What changed in response:
- An unset pill never truncates (only a chosen value may shrink). On phones under 390pt, active icon filters stay icon-only so the row fits.
- "Clear filters" is a Pressable with a 12pt hitSlop, so its hit area is about 44pt.
- Menus list "Any …" first (options order).

Declined:
- Merging Platform and Status into one filter button: the user asked for two icon toggles.
- Dropping the alarm ring on an active Status filter: the ring is the status colour's own role ("failed"). The grey Builds pill and the black triangle in the mockup come from the scrim and the stand-in glyph, not from the app.

Open: light mode and all-four-active have not been checked on a device yet.
