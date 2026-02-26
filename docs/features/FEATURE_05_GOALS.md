# Feature 05: Goal Tracking (Savings Targets)

Allow users to define savings targets, track progress, and link movements to goal contributions.

**Depends on**: Sprint 1–4 complete. Independent of Features 01, 02 — can be implemented in parallel with recurring debts.

**Target folder**: `features/goals/`

---

## Conceptual Design

Goals are savings targets with:
- A `targetAmount` — how much the user wants to save.
- An optional `targetDate` — a deadline.
- An optional `entity` — the account being saved in.
- A list of `contributions` — individual amounts contributed toward the goal, optionally linked to specific movements.

Progress is tracked by summing contributions. The current amount is **always derived from contributions** — it is never stored as a separate field to avoid drift between the stored value and the actual sum.

A contribution can be:
1. **Manual**: User explicitly adds a contribution (e.g., "I'm allocating $100k from my paycheck to this goal").
2. **Linked**: A specific movement is tagged as a contribution to this goal (the contribution amount equals the movement amount).

---

## Data Structures

```ts
// features/goals/types.ts

export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export interface IGoalContribution {
  id: string;                    // nanoid
  goalId: string;
  movementId?: string;           // if linked to a specific movement
  amount: number;                // integer cents
  date: string;                  // ISO 8601
  note?: string;
}

export interface IGoal {
  id: string;                    // nanoid
  name: string;                  // e.g. "Emergency Fund", "Vacation to Cartagena"
  description?: string;
  targetAmount: number;          // integer cents
  targetDate?: string;           // ISO 8601 — optional deadline
  entity?: string;               // associated account (optional)
  category: string;              // ref to config/categories.ts
  status: GoalStatus;
  contributions: IGoalContribution[];
  icon?: string;                 // e.g. 'house.fill', 'airplane', 'heart' (SF Symbol name)
  color?: string;                // hex color for visual differentiation
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}

// Derived values — computed at read time, NEVER stored
export interface IGoalProgress {
  goal: IGoal;
  currentAmount: number;         // sum of contributions
  progressPercentage: number;    // currentAmount / targetAmount * 100
  remainingAmount: number;       // targetAmount - currentAmount
  isOverfunded: boolean;         // currentAmount > targetAmount
  requiredMonthlySavings?: number; // remainingAmount / monthsUntilDeadline
  projectedCompletionDate?: Date;  // based on trailing 30-day avg contribution rate
  daysUntilDeadline?: number;
  isOverdue: boolean;
}
```

---

## Goals Domain Logic

```ts
// features/goals/domain/goalCalculations.ts
// Zero React imports — pure TypeScript

import { differenceInDays, differenceInMonths, addDays } from 'date-fns';

/**
 * Derives the current progress state of a goal from its contributions.
 * All monetary values are integer cents.
 */
export function computeGoalProgress(goal: IGoal, today: Date = new Date()): IGoalProgress {
  const currentAmount = goal.contributions.reduce((sum, c) => sum + c.amount, 0);
  const remainingAmount = Math.max(0, goal.targetAmount - currentAmount);
  const progressPercentage = Math.min(
    100,
    Math.round((currentAmount / goal.targetAmount) * 100),
  );
  const isOverfunded = currentAmount > goal.targetAmount;

  let daysUntilDeadline: number | undefined;
  let isOverdue = false;
  let requiredMonthlySavings: number | undefined;
  let projectedCompletionDate: Date | undefined;

  if (goal.targetDate) {
    const deadline = new Date(goal.targetDate);
    daysUntilDeadline = differenceInDays(deadline, today);
    isOverdue = daysUntilDeadline < 0 && !isOverfunded;

    if (daysUntilDeadline > 0) {
      const monthsRemaining = Math.max(1, differenceInMonths(deadline, today));
      requiredMonthlySavings = Math.round(remainingAmount / monthsRemaining);
    }
  }

  // Projected completion date based on trailing 30-day average
  const thirtyDaysAgo = addDays(today, -30);
  const recentContributions = goal.contributions.filter(
    (c) => new Date(c.date) >= thirtyDaysAgo,
  );
  const recentTotal = recentContributions.reduce((sum, c) => sum + c.amount, 0);
  const dailyRate = recentTotal / 30;

  if (dailyRate > 0 && remainingAmount > 0) {
    const daysToCompletion = Math.ceil(remainingAmount / dailyRate);
    projectedCompletionDate = addDays(today, daysToCompletion);
  }

  return {
    goal,
    currentAmount,
    progressPercentage,
    remainingAmount,
    isOverfunded,
    requiredMonthlySavings,
    projectedCompletionDate,
    daysUntilDeadline,
    isOverdue,
  };
}

/**
 * Checks whether a goal should be auto-completed.
 * Called after every contribution is added.
 */
export function shouldAutoComplete(goal: IGoal): boolean {
  const currentAmount = goal.contributions.reduce((sum, c) => sum + c.amount, 0);
  return currentAmount >= goal.targetAmount && goal.status === 'active';
}
```

---

## Edge Cases

| Case | Handling |
|---|---|
| Goal overfunded (`currentAmount > targetAmount`) | Mark `isOverfunded: true` in progress. Show progress bar at 100% with a "+X surplus" label. Auto-set `status: 'completed'` via `shouldAutoComplete`. |
| No target date | `requiredMonthlySavings`, `daysUntilDeadline`, and `isOverdue` are `undefined`. Only show progress percentage in the UI. |
| Goal linked to entity: entity balance drops | The entity balance and goal progress are independent. Do not automatically adjust contributions when entity balance drops — the contribution history is the source of truth. Warn the user if entity balance < sum of contributions. |
| Deleting a movement linked to a goal contribution | Deleting the movement must: (1) prompt the user that the movement is linked to a goal, (2) if confirmed, delete the corresponding contribution and update the goal's `updatedAt`. This requires cascade logic in the movement deletion flow. |
| Pausing a goal | Sets `status: 'paused'`. Paused goals are excluded from "required monthly savings" calculations and projected completion dates. |
| Abandoning a goal | Sets `status: 'abandoned'`. Contributions are preserved for historical reference. The goal is moved to an "Archived" section. |
| `projectedCompletionDate` with no recent contributions | `dailyRate = 0`, so `projectedCompletionDate` is `undefined`. Show "No recent activity — projection unavailable." |

---

## UX Improvements

- **Circular progress ring**: Filled arc from 0–360° proportional to `progressPercentage`, with the percentage in the center and goal icon/color.
- **"Add contribution" shortcut**: A quick-add button that creates both an `IMovement` (expense from the chosen entity) and an `IGoalContribution` simultaneously in a single action.
- **Milestone celebrations**: Haptic feedback + a brief animation at 25%, 50%, 75%, and 100% completion.
- **Required monthly savings**: When a deadline is set, show "You need to save $X/month to reach this goal by [date]."
- **Projected completion date**: "At your current rate, you'll reach this goal by [date]" — shown when there is recent contribution activity.
- **Goal list sorted by urgency**: Active goals sorted by days until deadline (most urgent first). No-deadline goals sorted to the bottom.
- **Progress on home screen**: Show the top 2–3 active goals as a compact widget on the home screen.

---

## SQLite Schema

```sql
CREATE TABLE goals (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  target_amount INTEGER NOT NULL,
  target_date   TEXT,
  entity_id     TEXT,
  category      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  icon          TEXT,
  color         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE goal_contributions (
  id            TEXT PRIMARY KEY,
  goal_id       TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  movement_id   TEXT,             -- nullable, references movements(id)
  amount        INTEGER NOT NULL,
  date          TEXT NOT NULL,
  note          TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX idx_goal_contributions_movement_id ON goal_contributions(movement_id);
```

---

## Implementation Checklist

- [ ] Create `features/goals/types.ts`
- [ ] Create `features/goals/domain/goalCalculations.ts` (pure TS, no React)
- [ ] Write unit tests: overfunding, no-deadline projections, `shouldAutoComplete`, cascade on movement deletion
- [ ] Create SQLite migration for `goals` and `goal_contributions` tables
- [ ] Implement `storage/repositories/sqlite/SQLiteGoalRepository.ts`
- [ ] Implement `storage/repositories/interfaces/IGoalRepository.ts`
- [ ] Create `features/goals/hooks/useGoals.ts`
- [ ] Create `features/goals/screens/GoalsListScreen.tsx`
- [ ] Create `features/goals/screens/GoalDetailScreen.tsx`
- [ ] Create `features/goals/screens/AddGoalScreen.tsx` (with zod validation)
- [ ] Create `features/goals/components/GoalProgressRing.tsx`
- [ ] Create `features/goals/components/AddContributionSheet.tsx`
- [ ] Add cascade check to movement deletion flow in `features/movements/`
- [ ] Add goals widget to home screen (`app/(tabs)/index.tsx`)
