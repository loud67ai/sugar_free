# Sugar Free — Functional Specification

## Overview

**Sugar Free** is a mobile-first Progressive Web App (PWA) that helps users track a daily sugar-free streak. It rewards consistency through a collectible character system, gracefully handles slip-ups, and optionally backs up data to a private GitHub Gist.

---

## Screens

| Screen | Route / ID | Purpose |
|---|---|---|
| Home | `screen-home` | Primary dashboard — streak, active character, check-in |
| Streak Broken | `screen-broken` | Shown automatically when streak is detected as broken |
| Deck | `screen-deck` | Browse all owned and locked characters |
| History | `screen-calendar` | Monthly calendar view of past check-ins |
| Settings | `screen-settings` | Cloud backup, danger zone, dev tools |

Navigation between screens is handled by `showScreen(name)`. The bottom navigation bar is present on Home, Deck, History, and Settings. The Broken screen has no nav bar.

---

## Data Model (`localStorage` key: `sugarfree_v2`)

```json
{
  "version": 2,
  "checkins": {
    "YYYY-MM-DD": "clean" | "cheat" | "fasted"
  },
  "streak": {
    "current": 0,
    "longest": 0,
    "cheatBalance": 0,
    "cheatMilestonesEarned": 0
  },
  "characters": {
    "<id>": { "defKey": "sprout", "ownStreak": 0, "isShiny": false }
  },
  "activeCharId": null,
  "ui": { "brokenAckedDate": null },
  "settings": { "githubPAT": "", "gistId": "" }
}
```

- **Migration**: v1 data (`sugarfree_v1`) is automatically migrated on first load. v1 stored booleans; v2 stores status strings.

---

## Streak Logic

### Streak Calculation (`computeStreakRaw`)
- Counts consecutive days backwards from today where the checkin status is `clean`, `cheat`, or `fasted`.
- If today has no check-in yet, counting starts from yesterday.

### Streak State (`streakState`)
| State | Condition |
|---|---|
| `new` | No check-ins ever |
| `pending` | Not checked in today, but yesterday was a success |
| `checked-in` | Today already has a successful check-in |
| `broken` | Last success was 2+ days ago |

- `broken` state also carries a `canFast` flag — `true` only if the gap between the last success and today is exactly 2 days (exactly 1 missed day).

### Streak Break Detection
- On app load (`updateHomeScreen`), if the streak is `broken` and the user has not already acknowledged the break today (`ui.brokenAckedDate !== today`), the **Streak Broken** screen is shown automatically.

---

## Check-In Actions

### Daily Check-In (`doCheckin`)
1. Records today as `"clean"` in `checkins`.
2. Recomputes current streak; updates `longest` if exceeded.
3. Evaluates cheat day milestones.
4. Evaluates character unlock milestones.
5. Ticks own-streak for all owned characters.
6. Saves data; triggers haptic feedback (`navigator.vibrate(200)`).
7. Shows unlock celebration overlay if a new character was earned, or cheat day earned overlay if applicable.

### Use Cheat Day (`useCheatDay`)
- Requires `cheatBalance > 0` and no check-in today.
- Records today as `"cheat"`; decrements `cheatBalance` by 1.
- Otherwise follows the same flow as a clean check-in (milestone checks, character ticks).

---

## Cheat Day System

- **Earning**: 1 cheat day is awarded for every 14 consecutive streak days.
  - Tracked via `cheatMilestonesEarned = floor(streak / 14)`.
  - Multiple cheat days can accumulate.
- **Display**: When `cheatBalance > 0` and today is unchecked, a badge and "Use a Cheat Day" button appear on the Home screen.

---

## Streak Broken Screen

Displayed when `shouldShowBroken()` returns true.

| Button | Action |
|---|---|
| ⚡ I Fasted 16 Hours | Marks **yesterday** as `"fasted"`, recovers the streak. Only shown if `canFast === true`. |
| Accept & Start Fresh | Adds a **Sugar Crash** character to the deck, resets all non-shiny character own-streaks, clears cheat milestones earned counter, and sets `brokenAckedDate` to today. |

- On **either** path, the Sugar Crash character is added to the deck (if not already owned).

---

## Character System

### Character Definitions

| Key | Name | Unlock (streak days) | Shiny at (own-streak days) |
|---|---|---|---|
| `sprout` | Sugar Sprout | Day 1 | 7 |
| `jumprope` | Week Warrior | Day 7 | 28 |
| `broccoli` | Broccoli Boss | Day 14 | 28 |
| `zen` | Zen Master | Day 30 | 42 |
| `bookworm` | Bookworm | Day 100 | 60 |
| `legend` | Year Legend | Day 365 | 100 |
| `crash` | Sugar Crash | On streak break | 14 |

### Unlock
- `checkMilestones` runs on every check-in and compares the previous vs. new streak against `earnAt` thresholds.
- A character is only added once per `defKey`; duplicate unlocks are ignored.

### Own-Streak & Shiny
- Each character has an independent `ownStreak` counter.
- `tickCharacters` increments `ownStreak` for every non-shiny character on each successful check-in.
- When `ownStreak >= shinyAt`, the character becomes permanently **Shiny** (`isShiny: true`).
- On streak break (`restartAfterBreak`), `ownStreak` is reset to 0 for all non-shiny characters.
- Shiny characters are immune to reset and display a gold glow + ✨ suffix.

### Active Character
- The user can tap any owned card in the Deck to make it the active character.
- The active character's animated sprite is shown on the Home screen.
- Before earning any character, a faded/frozen sprout placeholder is shown.

### Deck Screen
- Shows all owned characters as animated cards with their own-streak progress bar.
- Shows all unearned milestone characters as locked cards (🔒) labeled with their unlock day.

---

## Sprite Animation

- Characters are rendered as CSS background-image animations stepping through sprite sheet frames.
- Two rendering paths:
  - **Sprite sheet** (`sprites.png`): position calculated from `row`, `col`, `frameW`, `frameH`.
  - **Custom image** (e.g. `avatar-jumprope.png`): full-width strip of frames.
- Animation speed is character-specific (e.g. Sugar Crash is slow at `2.5s`; Year Legend is fast at `0.65s`).

---

## History / Calendar Screen

- Displays the current month and the 2 previous months.
- Each day cell is color-coded:
  - **Green** (`checked`): `"clean"` day
  - **Yellow** (`cheat`): `"cheat"` day
  - **Blue/teal** (`fasted`): `"fasted"` (fast recovery) day
  - **Today**: outlined ring
  - **Future**: muted/greyed

---

## Progress Bar (Home Screen)

- Shows progress toward the **next unearned** character milestone.
- Percentage = `(streak - prevMilestoneDay) / (nextMilestoneDay - prevMilestoneDay) * 100`.
- When all characters are earned: "🏆 All characters unlocked!"
- When streak is 0: "Check in today to start your streak!"

---

## Celebrations / Overlays

| Trigger | Overlay |
|---|---|
| New character unlocked | Character sprite + name + description + shiny countdown |
| Cheat day earned | 🍀 emoji + count of new cheat days |

- Overlays dismiss on tap or auto-dismiss after 4–6 seconds.

---

## Cloud Backup (GitHub Gist)

- Requires a GitHub **Personal Access Token** with `gist` scope only.
- PAT is stored in `localStorage` (user's own device) after first entry.

### Backup (`backup.save`)
1. Serializes `{ checkins }` to JSON.
2. If `gistId` exists in settings → PATCH the existing gist.
3. Otherwise → POST to create a new private gist named `sugarfree-backup.json`.
4. Stores the returned `gistId` for future updates.

### Restore (`backup.restore`)
1. If `gistId` is known, fetches that gist directly.
2. Otherwise, lists all user gists and finds one matching the description + filename.
3. Parses `checkins` from the backup and merges into current data.
4. Calls `updateHomeScreen()` to reflect restored state.

---

## PWA / Offline

- **Service Worker** (`sw.js`) registered on page load for offline caching.
- **Web App Manifest** (`manifest.json`) enables "Add to Home Screen" on mobile.
- Meta tags configure iOS standalone mode with black-translucent status bar.

---

## Settings Screen

| Control | Function |
|---|---|
| PAT input | Enter GitHub token for backup/restore |
| Back Up button | Triggers `backup.save()` |
| Restore button | Triggers `backup.restore()` |
| Reset All Data | Confirms, then clears `sugarfree_v2` and `sugarfree_v1` from localStorage |
| Next Day (dev) | Increments a day offset stored in `sugarfree_devoffset` |
| Reset to Today (dev) | Removes the day offset |

---

## Known Missing Assets

- `sprites.png` — sprite sheet for most characters (returns 404 in current workspace)
- `avatar-jumprope.png` — custom sprite strip for Week Warrior (returns 404 in current workspace)
- `favicon.ico` — browser tab icon (returns 404; non-critical)
