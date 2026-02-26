# Feature 07: Budget Limits with Alerts

Define maximum spending limits per category (or total) per time period, with threshold alerts when limits are approached or exceeded.

**Depends on**: Sprint 1–4 complete (especially integer `amount` and SQLite). Budget status computation is a multi-dimensional query that requires SQLite indexing to remain performant.

**Target folder**: `features/budgets/`

---

## Conceptual Design

A budget defines a spending limit for one or more categories over a recurring period. The system continuously compares actual spending against the limit and triggers alerts when predefined thresholds are crossed (e.g., 80% used, 100% exceeded).

Key design decisions:
- **Category-based**: A budget can cover a single category (e.g., "Dining Out") or multiple categories (e.g., "Dining Out + Takeaway").
- **Entity-scoped (optional)**: A budget can be scoped to a specific account, or apply globally across all accounts.
- **Period-based**: Budgets reset at the start of each period (weekly, monthly, quarterly, annual).
- **Rollover (optional)**: Unused budget from one period carries forward to the next.
- **Alert deduplication**: A given threshold alert fires at most once per period.

---

## Data Structures

```ts
// features/budgets/types.ts

export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type AlertThreshold = 0.5 | 0.75 | 0.8 | 0.9 | 1.0;

export interface IBudgetAlert {
  id: string;                    // nanoid
  budgetId: string;
  threshold: AlertThreshold;
  periodLabel: string;           // e.g. "2026-02" — deduplication key
  triggeredAt: string;           // ISO 8601
  actualAmount: number;          // integer cents at time of trigger
  budgetAmount: number;          // integer cents
  dismissed: boolean;
}

export interface IBudget {
  id: string;                    // nanoid
  name: string;                  // e.g. "Dining Out", "Monthly Food Budget"
  categoryIds: string[];         // which categories count toward this budget
  entityIds?: string[];          // limit to specific accounts (undefined = all accounts)
  limitAmount: number;           // integer cents — max spending per period
  period: BudgetPeriod;
  alertThresholds: AlertThreshold[];  // e.g. [0.8, 1.0]
  isActive: boolean;
  rollover: boolean;             // if true, unused budget carries to next period
  rolloverCap?: number;          // max rollover amount (integer cents) — prevents infinite accumulation
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}

// Derived — computed at read time, NEVER stored
export interface IBudgetStatus {
  budget: IBudget;
  periodStart: string;           // ISO 8601
  periodEnd: string;             // ISO 8601
  periodLabel: string;           // e.g. "2026-02"
  effectiveLimitAmount: number;  // limitAmount + rolloverAmount
  rolloverAmount: number;        // integer cents carried from prior period
  spentAmount: number;           // derived from matching movements
  remainingAmount: number;       // effectiveLimitAmount - spentAmount
  usagePercentage: number;       // spentAmount / effectiveLimitAmount * 100
  status: 'ok' | 'warning' | 'exceeded';
  pendingAlerts: AlertThreshold[]; // thresholds crossed but not yet fired
  firedAlerts: IBudgetAlert[];     // alerts already triggered this period
}
```

---

## Budget Evaluator Domain Logic

```ts
// features/budgets/domain/budgetEvaluator.ts
// Zero React imports — pure TypeScript

import { startOfWeek, endOfWeek, startOfMonth, endOfMonth,
         startOfQuarter, endOfQuarter, startOfYear, endOfYear,
         format } from 'date-fns';

/**
 * Returns the start and end of the current budget period for a given period type.
 */
export function getCurrentPeriodBounds(
  period: BudgetPeriod,
  today: Date = new Date(),
): { start: Date; end: Date; label: string } {
  switch (period) {
    case 'weekly':
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 }),
        label: format(today, "yyyy-'W'II"),
      };
    case 'monthly':
      return {
        start: startOfMonth(today),
        end: endOfMonth(today),
        label: format(today, 'yyyy-MM'),
      };
    case 'quarterly':
      return {
        start: startOfQuarter(today),
        end: endOfQuarter(today),
        label: `${today.getFullYear()}-Q${Math.ceil((today.getMonth() + 1) / 3)}`,
      };
    case 'annual':
      return {
        start: startOfYear(today),
        end: endOfYear(today),
        label: String(today.getFullYear()),
      };
  }
}

/**
 * Computes the current spending status for a budget.
 *
 * @param budget   - The budget definition
 * @param movements - All movements (filtered by period externally, or pass all and filter here)
 * @param firedAlerts - Already-triggered alerts for this period (for deduplication)
 * @param priorPeriodRemaining - Unused budget from prior period (for rollover)
 * @param today
 */
export function evaluateBudget(
  budget: IBudget,
  movements: IMovement[],
  firedAlerts: IBudgetAlert[],
  priorPeriodRemaining: number = 0,
  today: Date = new Date(),
): IBudgetStatus {
  const { start, end, label } = getCurrentPeriodBounds(budget.period, today);

  // Filter movements to this budget's period, categories, and entities
  const relevantMovements = movements.filter((m) => {
    if (m.typeOfMovement !== '2') return false; // expenses only
    const date = new Date(m.date);
    if (date < start || date > end) return false;
    if (!budget.categoryIds.includes(m.category)) return false;
    if (budget.entityIds && budget.entityIds.length > 0) {
      if (!m.entity || !budget.entityIds.includes(m.entity)) return false;
    }
    return true;
  });

  const spentAmount = relevantMovements.reduce((sum, m) => sum + m.amount, 0);

  const rolloverAmount = budget.rollover
    ? budget.rolloverCap !== undefined
      ? Math.min(priorPeriodRemaining, budget.rolloverCap)
      : priorPeriodRemaining
    : 0;

  const effectiveLimitAmount = budget.limitAmount + rolloverAmount;
  const remainingAmount = effectiveLimitAmount - spentAmount;
  const usagePercentage = effectiveLimitAmount > 0
    ? Math.round((spentAmount / effectiveLimitAmount) * 100)
    : 0;

  const status: IBudgetStatus['status'] =
    usagePercentage >= 100 ? 'exceeded' :
    usagePercentage >= 75 ? 'warning' :
    'ok';

  // Determine which alert thresholds have been crossed
  const firedThresholds = new Set(
    firedAlerts
      .filter((a) => a.periodLabel === label && !a.dismissed)
      .map((a) => a.threshold),
  );

  const pendingAlerts = budget.alertThresholds.filter((threshold) => {
    const crossed = (spentAmount / effectiveLimitAmount) >= threshold;
    return crossed && !firedThresholds.has(threshold);
  });

  return {
    budget,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    periodLabel: label,
    effectiveLimitAmount,
    rolloverAmount,
    spentAmount,
    remainingAmount,
    usagePercentage,
    status,
    pendingAlerts,
    firedAlerts: firedAlerts.filter((a) => a.periodLabel === label),
  };
}
```

---

## Edge Cases

| Case | Handling |
|---|---|
| Period boundary (monthly budget on Feb 28 → Mar 1) | `date-fns` `startOfMonth` / `endOfMonth` handles this correctly. `endOfMonth(new Date('2026-02-01'))` returns Feb 28. |
| Movement's category reassigned after the fact | Budget status must be recomputed from scratch when a movement is updated. Trigger re-evaluation in `useEffect` watching the movements store. |
| Deleting a movement that counted toward a budget | Same as category reassignment — trigger recomputation. Budget status is always derived, never stored, so it self-corrects. |
| Multiple categories per budget | The `categoryIds: string[]` field handles this. A "Food" budget can cover both "Comida" (1) and "Entretenimiento" (6). |
| Rollover budget accumulation | The `rolloverCap` field prevents the rollover from growing unboundedly. Without a cap, a user who consistently underspends will accumulate a very large effective limit that masks budget breaches. |
| Alert deduplication | The `periodLabel` on `IBudgetAlert` is the deduplication key. Before firing an alert, check if an unfired alert for the same `(budgetId, threshold, periodLabel)` combination already exists. |
| Budget with 0 limit | Guard: `if (budget.limitAmount === 0) return early` — a zero-limit budget is invalid. Validate at creation with zod: `limitAmount: z.number().int().positive()`. |
| `usagePercentage` > 100 | Clamp display to 100% in the progress bar, but show the actual overage amount ("Exceeded by $X") separately. |

---

## UX Improvements

- **Budget cards on home screen or a dedicated "Budgets" tab**: Each card shows the budget name, progress bar (green/yellow/red), amount spent vs. limit, and a "X days left" label.
- **Progress bar color transitions**:
  - Below 70%: green (`#2db100`)
  - 70–90%: yellow (`#f5a623`)
  - Above 90%: red (`#c40505`)
- **In-app alert sheet**: When `pendingAlerts` is non-empty, show a dismissible sheet (not a push notification) listing all crossed thresholds. Each row has "Dismiss" and "View Budget" actions.
- **Push notifications**: For the 100% threshold specifically, send a local push notification via `expo-notifications` even if the app is in the background.
- **Monthly report card**: After a period ends, generate a summary card: "You stayed within budget in 3/4 categories this month."
- **Historical adherence chart**: A mini bar chart on the budget detail screen showing the last 6 periods: green bars = under budget, red bars = over budget.

---

## SQLite Schema

```sql
CREATE TABLE budgets (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  limit_amount      INTEGER NOT NULL,
  period            TEXT NOT NULL,
  rollover          INTEGER NOT NULL DEFAULT 0,
  rollover_cap      INTEGER,
  is_active         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE budget_categories (
  budget_id    TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category_id  TEXT NOT NULL,
  PRIMARY KEY (budget_id, category_id)
);

CREATE TABLE budget_entities (
  budget_id    TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  entity_id    TEXT NOT NULL,
  PRIMARY KEY (budget_id, entity_id)
);

CREATE TABLE budget_alert_thresholds (
  budget_id   TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  threshold   REAL NOT NULL,
  PRIMARY KEY (budget_id, threshold)
);

CREATE TABLE budget_alerts (
  id              TEXT PRIMARY KEY,
  budget_id       TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  threshold       REAL NOT NULL,
  period_label    TEXT NOT NULL,
  triggered_at    TEXT NOT NULL,
  actual_amount   INTEGER NOT NULL,
  budget_amount   INTEGER NOT NULL,
  dismissed       INTEGER NOT NULL DEFAULT 0,
  UNIQUE(budget_id, threshold, period_label)
);

CREATE INDEX idx_budget_alerts_budget_id ON budget_alerts(budget_id);
```

---

## Implementation Checklist

- [ ] Create `features/budgets/types.ts`
- [ ] Create `features/budgets/domain/budgetEvaluator.ts` (pure TS, no React)
- [ ] Write unit tests: threshold crossing, rollover cap, deduplication, period boundary handling (Feb edge case), division by zero, over-100% clamping
- [ ] Create SQLite migration for all budget tables
- [ ] Implement `storage/repositories/sqlite/SQLiteBudgetRepository.ts`
- [ ] Implement `storage/repositories/interfaces/IBudgetRepository.ts`
- [ ] Create `features/budgets/hooks/useBudgets.ts`
- [ ] Create `features/budgets/hooks/useBudgetAlerts.ts` (fires alerts when `pendingAlerts` is non-empty)
- [ ] Create `features/budgets/screens/BudgetsListScreen.tsx`
- [ ] Create `features/budgets/screens/BudgetDetailScreen.tsx` (with historical chart)
- [ ] Create `features/budgets/screens/AddBudgetScreen.tsx` (with zod validation)
- [ ] Create `features/budgets/components/BudgetProgressCard.tsx`
- [ ] Create `features/budgets/components/BudgetAlertSheet.tsx`
- [ ] Wire `expo-notifications` for 100% threshold alerts
- [ ] Add budget cards widget to home screen
- [ ] Trigger budget re-evaluation in `movementsStore.ts` on every movement mutation
