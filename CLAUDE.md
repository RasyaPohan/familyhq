# CLAUDE.md — Family HQ

This file contains everything Claude needs to understand this codebase and work effectively in future sessions.

---

## Project Overview

**Family HQ** is a private family management app for the Yanwar family. It is a mobile-first PWA built in React + Vite. The family is split across two locations — Rasya is in Vancouver (PDT), the rest of the family is in Jakarta (WIB) — so timezone and currency awareness is built into the data layer.

The app has no traditional login. Authentication is family-code based (6-digit code identifies the HQ) with a 4-digit PIN that unlocks a 24-hour device session. The active family member is stored in localStorage.

---

## Tech Stack

- **Framework**: React 18 + Vite (JSX only — no TypeScript in pages/components)
- **Routing**: React Router v6 (`BrowserRouter`)
- **Styling**: Tailwind CSS + shadcn/ui components (`src/components/ui/`)
- **Animations**: Framer Motion (`motion`, `AnimatePresence`)
- **Data**: Supabase (via `src/lib/db.js` abstraction layer)
- **State**: React local state + localStorage + `@tanstack/react-query`
- **Icons**: lucide-react
- **Fonts**: Fredoka (headings, `.font-heading`), Plus Jakarta Sans (body, `.font-body`)

---

## App Entry Flow

```
/ (LandingPage)
  → /create-hq or /join-hq   (CreateHQFlow / JoinHQFlow)
  → /pin                      (PinScreen — 4-digit PIN, 24h session)
  → /select                   (FamilySelect — pick active member)
  → /outdoor                  (OutdoorScene — animated front yard, tap to enter)
  → /home                     (IsometricHome — SVG house with room zones)
  → /dashboard                (Dashboard — main app hub, inside Layout)
```

After first entry, members can navigate directly to any Layout route via the sidebar hamburger menu.

---

## Route Map

### Outside Layout (no header/sidebar)
| Path | Component | Notes |
|------|-----------|-------|
| `/` | `LandingPage` | Landing/marketing page |
| `/create-hq` | `CreateHQFlow` | Creates new family HQ |
| `/join-hq` | `JoinHQFlow` | Joins existing HQ by code |
| `/pin` | `PinScreen` | 4-digit PIN entry |
| `/select` | `FamilySelect` | Pick active family member |
| `/outdoor` | `OutdoorScene` | Outdoor yard entry scene |
| `/home` | `IsometricHome` | Isometric/top-down house view |

### Inside Layout (has top bar + sidebar drawer)
| Path | Component |
|------|-----------|
| `/dashboard` | `Dashboard` |
| `/calendar` | `CalendarPage` |
| `/chores` | `ChoresPage` |
| `/meals` | `MealsPage` |
| `/budget` | `BudgetPage` |
| `/noticeboard` | `NoticeboardPage` |
| `/goals` | `GoalsPage` |
| `/rewards` | `RewardsPage` |
| `/guide` | `GuidePage` |
| `/moments` | `MomentsPage` |

---

## Data Layer — `src/lib/db.js`

All Supabase queries go through this abstraction. Every entity has four methods:

```js
db.EntityName.filter({ key: value }, { orderBy, ascending }) // → array
db.EntityName.create({ ...fields })                          // → created object
db.EntityName.update(id, { ...fields })                      // → updated object
db.EntityName.delete(id)                                     // → void
```

### All Entities

| Entity | Table | Notes |
|--------|-------|-------|
| `FamilyHQ` | `family_hq` | One row per family |
| `FamilyMember` | `family_members` | Always filter by `family_code` |
| `Chore` | `chores` | `completed`, `assigned_to`, `due_date` |
| `CalendarEvent` | `calendar_events` | `date` or `start_date` field |
| `MealPlan` | `meal_plans` | Weekly meal planning |
| `BudgetTransaction` | `budget_transactions` | Ordered by `created_at` DESC |
| `Notice` | `notices` | Noticeboard posts |
| `FamilyGoal` | `family_goals` | Shared family goals |
| `FamilyPhoto` | `family_photos` | Ordered by `created_at` DESC |
| `PhotoComment` | `photo_comments` | Filter by `photo_id` |
| `Reward` | `rewards` | Reward catalog |
| `RewardRedemption` | `reward_redemptions` | Ordered by `created_at` DESC |
| `ActivityLog` | `activity_logs` | Ordered by `created_at` DESC |

**Photo uploads**: `db.uploadMomentPhoto(file, familyCode)` → returns public URL string.

**Pattern for every query**: always filter by `family_code`:
```js
const items = await db.Chore.filter({ family_code: familyCode });
```

---

## Family Store — `src/lib/familyStore.js`

localStorage-backed session management. Import what you need:

```js
import {
  getFamilyCode,      // → string | null
  getFamilyName,      // → string (e.g. "The Yanwar's HQ" or "Family")
  setFamilySession,   // (code, name) → void
  clearFamilySession, // → void
  getActiveMember,    // → member object | null
  setActiveMember,    // (member) → void
  getThemeMode,       // → 'dark' | 'light'
  setThemeMode,       // (mode) → void
  MEMBER_COLORS,      // { purple, pink, blue, green, orange, yellow } each has .hex, .bg, .text, .border, .from
  getLevelFromXp,     // (xp) → 1-5
  getLevelTitle,      // (level) → "⭐ Family Star" etc.
  getLevelProgress,   // (xp) → 0-100
  getGreeting,        // () → 'morning' | 'afternoon' | 'evening'
} from "@/lib/familyStore";
```

**Member color usage pattern** (consistent throughout the app):
```js
const memberColor = member ? (MEMBER_COLORS[member.color] || MEMBER_COLORS.purple) : MEMBER_COLORS.purple;
// Then use memberColor.hex for inline styles
```

**Cross-component member sync**: when switching active member, dispatch:
```js
window.dispatchEvent(new Event("member-changed"));
```
Layout and IsometricHome both listen for this event.

---

## XP Engine — `src/lib/xpEngine.js`

```js
import { awardXP } from "@/lib/xpEngine";

const result = await awardXP(member, amount, reason, extraFields);
// result: { leveled_up, old_level, new_level, xp_gained }
```

- Updates member's `xp`, `level`, `weekly_xp`, `week_start` in Supabase
- Resets `weekly_xp` if a new week started
- Creates an `ActivityLog` entry automatically
- Fires `window` events:
  - `xp-earned` — `{ detail: { amount, memberName } }` — triggers FamilyPet bubble
  - `level-up` — `{ detail: { level, title } }` — triggers LevelUpOverlay

---

## Timezone & Currency — `src/lib/tzCurrency.js`

Rasya is in Vancouver (PDT, UTC-7). The rest of the family is in Jakarta (WIB, UTC+7). Budget amounts are always stored in **CAD**, displayed as IDR for non-Rasya members.

```js
import { isRasya, formatCurrency, formatTimeWithTz, inputToCAD } from "@/lib/tzCurrency";
// CAD_TO_IDR = 11500
```

Always store times with a timezone field. Always convert on display, never at rest.

---

## Auth Context — `src/lib/AuthContext.jsx`

This is a **stub** — auth is disabled. The provider always returns:
- `isAuthenticated: true`
- `isLoadingAuth: false`
- `isLoadingPublicSettings: false`
- `authError: null`

Do not add real auth logic here. The family code + PIN system in `familyStore.js` is the only access control.

---

## Layout & Navigation

`src/components/Layout.jsx` wraps all main app pages. It provides:
- Sticky top bar (hamburger left, "🏠 Family HQ" center, member avatar right)
- Slide-in sidebar drawer (framer-motion spring)
- Swipe gestures: swipe right from left edge opens sidebar; horizontal swipes navigate between pages
- Leave HQ confirmation modal
- Theme toggle (dark/light)
- Three global overlays rendered at the top: `<OnboardingWizard>`, `<XPPopup>`, `<LevelUpOverlay>`, `<FamilyPet>`

**Sidebar nav order**: HQ Home (`/outdoor`), Dashboard, Calendar, Chores, Meals, Budget, Board, Goals, Rewards Shop, Moments.

---

## Global Overlays (always mounted inside Layout)

| Component | File | What it does |
|-----------|------|-------------|
| `FamilyPet` | `src/components/FamilyPet.jsx` | Animated pet egg/cat in screen corner. Tap for reactions, long-press for stats. Evolves with family XP. Claude AI messages on tap (30s cooldown). |
| `XPPopup` | `src/components/XPPopup.jsx` | Toast popup when `xp-earned` event fires |
| `LevelUpOverlay` | `src/components/LevelUpOverlay.jsx` | Full-screen celebration when `level-up` event fires |
| `OnboardingWizard` | `src/components/OnboardingWizard.jsx` | First-time walkthrough for new members |

---

## FamilyPet Details

**Pet evolution stages** (keyed by total family XP):

| Stage | Min XP | Label |
|-------|--------|-------|
| `egg` | 0 | Egg |
| `kitten` | 200 | Kitten |
| `cat` | 500 | Cat |
| `happy_cat` | 1000 | Happy Cat |
| `legend` | 2000 | Legend Cat |

**Tap behavior**:
1. If `VITE_ANTHROPIC_API_KEY` is set and 30s have passed since last AI call → fetch Claude message
2. If tapped within 30s of last AI call → show `"I need a moment to think... 🐱"`
3. Otherwise → random TAP_REACTIONS (10 options, 6 animation types)

**Animation states**: `idle`, `happy`, `sleeping`, `excited`, `tap-spin`, `tap-jump`, `tap-shake`, `tap-flip`, `tap-shrink`, `tap-run`

**Pet name**: stored in localStorage as `hq_pet_name`

**AI prompt** (Claude Sonnet): builds context from live DB queries (chores done today, next event, days since last photo, total XP, member name/role, time of day). Fallback to local messages on API error.

**localStorage keys** used by FamilyPet:
- `hq_pet_name` — pet's name
- `hq_pet_last_stage` — last known stage id (evolution detection)
- `hq_last_interaction` — last interaction timestamp

---

## IsometricHome — `src/pages/IsometricHome.jsx`

SVG-based house with two views toggled by a pill button at the bottom:
- **Front** — orthographic flat elevation (house facade, roof, windows, door)
- **Top** — floor plan grid looking straight down

**Dynamic layout**: `getLayout(memberCount)` assigns rooms automatically:

| Members | Grid | TV Mode |
|---------|------|---------|
| 0–2 | 2×1 | Bar below house |
| 3 | 2×2 | Slot (bottom-right) |
| 4 | 2×2 | Overlay strip between rows |
| 5 | 3×2 | Slot (bottom-center) |
| 6 | 3×2 | Overlay strip between rows |

Members are sorted by `id` for stable slot assignment. Unused slots show shared spaces: 🌿 Garden, 📚 Library, 🚗 Garage.

Clicking a member room opens a `CenteredPopup` card (XP, streak, level, switch button). Clicking the TV navigates to `/dashboard`.

---

## OutdoorScene — `src/pages/OutdoorScene.jsx`

Entry scene before IsometricHome. Entirely SVG + CSS — no images. Features:
- Night sky with 80 twinkling stars, crescent moon with craters
- Distant city silhouette
- House facade with warm glowing windows and porch light
- Family car in driveway — colored in active member's `memberColor.hex`, family name on the side
- Tree, mailbox (with family name), lamp post, garden flowers, fireflies
- Animated chimney smoke

**Interaction**: tapping anywhere triggers `scale: 4, opacity: 0` zoom-in → navigate to `/home`.

**Welcome text**: "Welcome to / The [FamilyName]'s HQ" — pulled from `getFamilyName()` with HQ suffix stripped.

---

## CSS & Styling Conventions

- **Dark mode** is default. The `dark` class is applied to `document.documentElement`.
- Always use `style={{ ... }}` inline for dynamic colors (member colors, hex values).
- Use Tailwind classes for layout and spacing.
- `bg-background`, `bg-card`, `text-foreground`, `border-border` — use these CSS variable-backed classes.
- Gradient utilities: `.gradient-primary` (purple→pink), `.gradient-cool` (blue→teal), `.gradient-warm` (yellow→orange).
- `font-heading` = Fredoka. `font-body` = Plus Jakarta Sans.
- Safe area: use `env(safe-area-inset-bottom)` for bottom-fixed elements (mobile notch/home bar).

---

## Environment Variables

Located in `.env` at project root:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ANTHROPIC_API_KEY=     ← fill in for pet AI messages
```

Access in code: `import.meta.env.VITE_*`

---

## Key Patterns & Conventions

**Always guard with familyCode**:
```js
const familyCode = getFamilyCode();
if (!familyCode) { navigate("/", { replace: true }); return; }
```

**Member color** (used in dozens of places):
```js
const memberColor = member ? (MEMBER_COLORS[member.color] || MEMBER_COLORS.purple) : MEMBER_COLORS.purple;
// memberColor.hex → e.g. "#8B5CF6"
```

**Modals / centered popups**: use the `CenteredPopup` pattern (two `position: fixed; inset: 0` divs — backdrop + flex wrapper) to avoid Framer Motion transform conflicts with centering.

**No TypeScript in pages/components**. Types exist only in `src/utils/index.ts` and some lib files.

**No mock data**. All data comes from Supabase via `db.*`. Never hardcode family member names in logic — always query from DB.

**XP awarding**: always use `awardXP()` from xpEngine — never update the member record directly.

**Activity logging**: `awardXP()` handles this automatically. For non-XP actions (posting a Moment, etc.), create an `ActivityLog` entry manually via `db.ActivityLog.create()`.

---

## Family-Specific Context

- **Family name**: The Yanwar's HQ (Yanwar family)
- **Rasya**: child member, lives in Vancouver BC, uses CAD and PDT timezone
- **Other members**: in Jakarta, use IDR and WIB timezone
- **Pet name**: set by the family at first launch (stored in localStorage)
- The app is intentionally **private** — no public-facing auth, no user registration. Only people with the family code + PIN can use it.
