# Feature 01: Monthly Recurring Debts

Subscriptions, utilities, and any expense that occurs on a fixed schedule.

**Depends on**: Sprint 1–4 complete (especially integer `amount` and SQLite migration)

**Target folder**: `features/recurringDebts/`

---

## Conceptual Design

Recurring debts require distinguishing between two separate entities:

1. **The recurring rule** — the template (e.g., "Netflix, $49.900, monthly on the 15th")
2. **The instantiated movement** — the actual transaction created from the rule

These have a parent-child relationship with a link table tracking which movements were created from which rule and for which period.

**Execution model**: On each app open, a scheduler checks whether any active rule has a `nextDueDate` that has passed and hasn't yet generated a movement for that period. If so, it either auto-creates the movement (if `autoPost: true`) or prompts the user to confirm before posting. After creation, `nextDueDate` is advanced to the next occurrence.

---

## Data Structures

```ts
// features/recurringDebts/types.ts

type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';

export interface IRecurringDebt {
  id: string;                        // nanoid
  name: string;                      // e.g. "Netflix", "Electricity Bill"
  amount: number;                    // integer cents — NOT a formatted string
  category: string;                  // ref to config/categories.ts
  entity?: string;                   // which account it debits
  frequency: RecurrenceFrequency;
  startDate: string;                 // ISO 8601
  nextDueDate: string;               // ISO 8601 — updated after each instantiation
  endDate?: string;                  // ISO 8601 — undefined = indefinite
  isActive: boolean;
  autoPost: boolean;                 // if true, auto-creates movement; if false, prompts user
  estimatedAmount: boolean;          // true if amount is an estimate (e.g. utilities)
  createdAt: string;                 // ISO 8601
  updatedAt: string;                 // ISO 8601
}

export interface IRecurringMovementLink {
  recurringDebtId: string;
  movementId: string;
  periodLabel: string;               // e.g. "2026-02" for monthly, "2026-W07" for weekly
  actualAmount: number;              // the amount actually posted (may differ from rule amount)
}
```

---

## Scheduler Domain Logic

```ts
// features/recurringDebts/domain/recurringDebtScheduler.ts
// Zero React imports — pure TypeScript

import { addWeeks, addMonths, addQuarters, addYears, isBefore, isAfter } from 'date-fns';

/**
 * Computes the next due date after a given reference date for a given frequency.
 * Handles month-length edge cases (e.g. monthly on the 31st → last day of shorter months).
 */
export function advanceNextDueDate(
  currentDueDate: Date,
  frequency: RecurrenceFrequency,
): Date {
  switch (frequency) {
    case 'weekly':     return addWeeks(currentDueDate, 1);
    case 'biweekly':   return addWeeks(currentDueDate, 2);
    case 'monthly':    return addMonths(currentDueDate, 1);
    case 'quarterly':  return addQuarters(currentDueDate, 1);
    case 'annual':     return addYears(currentDueDate, 1);
  }
}

/**
 * Returns all recurring debts that are due on or before today and have not yet
 * been posted for their current period.
 */
export function getDueRules(
  rules: IRecurringDebt[],
  existingLinks: IRecurringMovementLink[],
  today: Date = new Date(),
): IRecurringDebt[] {
  return rules.filter((rule) => {
    if (!rule.isActive) return false;
    if (rule.endDate && isAfter(today, new Date(rule.endDate))) return false;

    const nextDue = new Date(rule.nextDueDate);
    if (!isBefore(nextDue, today) && nextDue.toDateString() !== today.toDateString()) return false;

    // Check if already posted for this period
    const periodLabel = computePeriodLabel(nextDue, rule.frequency);
    return !existingLinks.some(
      (link) => link.recurringDebtId === rule.id && link.periodLabel === periodLabel,
    );
  });
}

/**
 * Derives the period label for a given due date and frequency.
 * Used as a deduplication key to prevent double-posting.
 */
export function computePeriodLabel(date: Date, frequency: RecurrenceFrequency): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  switch (frequency) {
    case 'weekly':
    case 'biweekly':
      // ISO week number
      return `${y}-W${getISOWeek(date)}`;
    case 'monthly':
      return `${y}-${m}`;
    case 'quarterly':
      return `${y}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
    case 'annual':
      return `${y}`;
  }
}
```

---

## Edge Cases

| Case | Handling |
|---|---|
| App not opened for 3 months | Back-fill all missed periods up to today. Create all missed movements. Make this configurable per rule (`backfillMissed: boolean`). |
| Insufficient balance with `autoPost: true` | Post the movement anyway (financial apps track reality). Flag the resulting negative balance in the UI. |
| Monthly rule set on the 31st | `date-fns` `addMonths` already clamps to the last day of shorter months. No extra handling needed. |
| Variable amounts (utilities) | `amount` is the default/estimated value. Set `estimatedAmount: true`. When `autoPost: false`, show the estimated amount pre-filled and let the user confirm or edit before posting. |
| Rule with `endDate` in the past | Auto-set `isActive: false` during the due-check sweep. Do not delete — preserve history. |
| User manually deletes an auto-posted movement | Delete the corresponding `IRecurringMovementLink`. The next due-check will re-post the movement for that period. Warn the user before deletion if the movement was auto-posted. |

---

## UX Improvements

- **Dedicated "Recurring" screen**: List all active rules with name, amount, frequency, next due date, and a pause/resume toggle.
- **Monthly calendar overlay**: Mini-calendar on the home screen or recurring screen showing dots on days when debts are due.
- **Pre-due notifications**: `expo-notifications` local trigger 3 days before `nextDueDate` for rules with `autoPost: false`.
- **Pending confirmations banner**: When rules are due but `autoPost: false`, show a dismissible banner on the home screen with a count ("3 recurring debts need confirmation").
- **Quick edit**: Swipe-to-edit on a recurring rule to update the amount before it posts (useful for variable utilities).
- **Pause toggle**: Sets `isActive: false` without deleting the rule. Paused rules show in a "Paused" section.

---

## Performance Risks

| Risk | Mitigation |
|---|---|
| Due-check on app open is O(n) on rules | Fine at scale (users will have <100 rules). No optimization needed initially. |
| Back-filling missed periods creates N movements | Batch all missed movements into a **single storage write transaction**, not one write per movement. |
| Notifications for many rules | Use a single batch `expo-notifications` schedule call, not one call per rule. Reschedule all notifications when rules change. |

---

## Implementation Checklist

- [ ] Create `features/recurringDebts/types.ts` with `IRecurringDebt` and `IRecurringMovementLink`
- [ ] Create `features/recurringDebts/domain/recurringDebtScheduler.ts` (pure TS, no React)
- [ ] Add unit tests for `getDueRules`, `advanceNextDueDate`, `computePeriodLabel` (especially Feb 29 edge case)
- [ ] Create SQLite migration for `recurring_debts` and `recurring_movement_links` tables
- [ ] Implement `storage/repositories/sqlite/SQLiteRecurringDebtRepository.ts`
- [ ] Implement `storage/repositories/interfaces/IRecurringDebtRepository.ts`
- [ ] Add due-check call to app start in `app/_layout.tsx` (after migrations, before rendering)
- [ ] Create `features/recurringDebts/screens/RecurringDebtsScreen.tsx`
- [ ] Create `features/recurringDebts/components/RecurringRuleCard.tsx`
- [ ] Wire notifications via `expo-notifications`
- [ ] Add "Recurring" tab to `app/(tabs)/_layout.tsx`
