# Feature 02: Long-Term Debts with Amortization

Mortgage, car loan, student loan, and any debt with a principal balance, interest rate, and payment schedule.

**Depends on**: Sprint 1–4 complete. SQLite migration is a **hard prerequisite** — storing a 360-entry amortization table in a single AsyncStorage value (~50KB JSON per loan) will cause read/write failures.

**Target folder**: `features/longTermDebts/`

---

## Conceptual Design

Long-term debts differ fundamentally from recurring subscriptions:

- They have a **principal** that decreases over time.
- They generate **interest cost** that increases the total amount paid.
- They have a **payment schedule** (amortization table) that can be precomputed.

The **French amortization method** (equal monthly payments, varying principal/interest split per period) is the most common in Latin American lending and should be the default.

**The amortization table is computed once on debt creation and stored.** Each entry in the table is either `pending`, `paid`, `overdue`, or `partial`. When the user marks a payment as made, the entry is updated and a corresponding `IMovement` is created in the movements store, maintaining a complete transaction history.

---

## Data Structures

```ts
// features/longTermDebts/types.ts

type AmortizationMethod = 'french' | 'german' | 'american';

export interface IAmortizationEntry {
  periodNumber: number;              // 1-indexed payment number
  dueDate: string;                   // ISO 8601
  paymentAmount: number;             // total payment (principal + interest), integer cents
  principalAmount: number;           // portion reducing principal
  interestAmount: number;            // portion as interest cost
  remainingPrincipal: number;        // balance after this payment
  linkedMovementId?: string;         // set when user marks payment as made
  partialAmountPaid?: number;        // integer cents, set when status === 'partial'
  status: 'pending' | 'paid' | 'overdue' | 'partial';
}

export interface ILongTermDebt {
  id: string;                        // nanoid
  name: string;                      // e.g. "Home Mortgage"
  lender: string;                    // e.g. "Bancolombia"
  originalPrincipal: number;         // integer cents — never changes after creation
  currentPrincipal: number;          // integer cents — updated on each payment
  annualInterestRate: number;        // e.g. 0.12 for 12% annual
  monthlyPayment: number;            // integer cents — fixed for French method
  amortizationMethod: AmortizationMethod;
  termMonths: number;                // total loan duration in months
  startDate: string;                 // ISO 8601
  entity?: string;                   // account used for payments
  amortizationTable: IAmortizationEntry[];
  rateHistory?: Array<{              // for variable-rate loans
    effectiveDate: string;
    annualRate: number;
  }>;
  category: 'mortgage' | 'vehicle' | 'education' | 'personal' | 'other';
  isActive: boolean;                 // false when fully paid off
  createdAt: string;                 // ISO 8601
  updatedAt: string;                 // ISO 8601
}
```

---

## Amortization Domain Logic

```ts
// features/longTermDebts/domain/amortization.ts
// Zero React imports — pure TypeScript

import { addMonths } from 'date-fns';

/**
 * Computes a full French (equal-payment) amortization table.
 * All monetary values are integer cents.
 * The final payment absorbs any rounding remainder to ensure balance reaches exactly zero.
 */
export function computeFrenchAmortizationTable(
  principal: number,       // integer cents
  annualRate: number,      // e.g. 0.12 for 12%
  termMonths: number,
  startDate: Date,
): IAmortizationEntry[] {
  if (principal <= 0) throw new Error('Principal must be greater than zero');
  if (annualRate <= 0) throw new Error('Interest rate must be greater than zero');
  if (termMonths <= 0) throw new Error('Term must be greater than zero');

  const monthlyRate = annualRate / 12;

  // Fixed monthly payment (French method formula)
  const monthlyPayment = Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1),
  );

  const table: IAmortizationEntry[] = [];
  let remaining = principal;

  for (let i = 1; i <= termMonths; i++) {
    const interestAmount = Math.round(remaining * monthlyRate);
    let principalAmount = monthlyPayment - interestAmount;

    // Final payment: absorb rounding remainder
    if (i === termMonths) {
      principalAmount = remaining;
    }

    remaining -= principalAmount;

    table.push({
      periodNumber: i,
      dueDate: addMonths(startDate, i).toISOString(),
      paymentAmount: i === termMonths ? principalAmount + interestAmount : monthlyPayment,
      principalAmount,
      interestAmount,
      remainingPrincipal: Math.max(0, remaining),
      status: 'pending',
    });
  }

  return table;
}

/**
 * Recomputes the remaining amortization table from a given period onward.
 * Used after an early or extra principal payment changes the remaining balance.
 */
export function recomputeFromPeriod(
  debt: ILongTermDebt,
  fromPeriod: number,
  newPrincipal: number,
): IAmortizationEntry[] {
  const paidEntries = debt.amortizationTable.filter((e) => e.periodNumber < fromPeriod);
  const remainingTermMonths = debt.termMonths - fromPeriod + 1;
  const startDate = new Date(
    debt.amortizationTable.find((e) => e.periodNumber === fromPeriod)!.dueDate,
  );

  const newEntries = computeFrenchAmortizationTable(
    newPrincipal,
    debt.annualInterestRate,
    remainingTermMonths,
    addMonths(startDate, -1), // startDate for addMonths(startDate, i) to produce correct dates
  ).map((e) => ({ ...e, periodNumber: e.periodNumber + fromPeriod - 1 }));

  return [...paidEntries, ...newEntries];
}

/**
 * Computes the total interest cost over the full life of the loan.
 */
export function computeTotalInterestCost(table: IAmortizationEntry[]): number {
  return table.reduce((sum, entry) => sum + entry.interestAmount, 0);
}

/**
 * Returns the first overdue entry (due date in the past, status not 'paid').
 */
export function findFirstOverdueEntry(
  table: IAmortizationEntry[],
  today: Date = new Date(),
): IAmortizationEntry | undefined {
  return table.find(
    (e) =>
      e.status !== 'paid' &&
      e.status !== 'partial' &&
      new Date(e.dueDate) < today,
  );
}
```

---

## Edge Cases

| Case | Handling |
|---|---|
| Floating-point rounding | All math uses integer arithmetic (cents). The final payment absorbs the rounding remainder to ensure balance reaches exactly zero. |
| Early payoff (user pays off the entire remaining balance) | Set `isActive: false`, mark all remaining entries as `paid`, create a single movement for the payoff amount. |
| Extra principal payment (reduces balance but keeps paying) | Call `recomputeFromPeriod` with the new remaining principal. The table is regenerated from the next period onward. |
| Variable-rate loans | Store rate changes in `rateHistory`. When a rate change takes effect, call `recomputeFromPeriod` with the new rate. |
| Partial payment | Set `status: 'partial'` and `partialAmountPaid` on the entry. The remaining balance is `paymentAmount - partialAmountPaid`. The overdue amount carries forward. |
| Storing 360 entries in AsyncStorage | **Do not.** SQLite migration is a hard prerequisite for this feature. Each amortization entry is a row in a `amortization_entries` table, not a blob. |
| Displaying all 360 entries in a list | Use `FlatList` with `windowSize={5}` and `initialNumToRender={12}`. Do not render the full table at once. |

---

## UX Improvements

- **Progress bar** showing `originalPrincipal - currentPrincipal` paid vs. `currentPrincipal` remaining, with a percentage label.
- **Interest cost summary**: "You will pay $X in total interest over the life of this loan."
- **Year-by-year breakdown chart**: Bar chart showing annual principal paid vs. annual interest paid — helps users understand the early-year interest-heavy reality of mortgages.
- **"What if I pay extra?" simulator**: Input field for an additional monthly principal payment → recalculates and shows: new payoff date, months saved, and total interest saved.
- **Overdue payment highlight**: First overdue entry shown in red with a "days overdue" counter and a "Make payment" CTA.
- **Mark payment as made**: Tapping a pending entry opens a confirmation sheet showing the breakdown (principal + interest), pre-fills the amount, and creates the movement.

---

## SQLite Schema

```sql
CREATE TABLE long_term_debts (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  lender                TEXT NOT NULL,
  original_principal    INTEGER NOT NULL,
  current_principal     INTEGER NOT NULL,
  annual_interest_rate  REAL NOT NULL,
  monthly_payment       INTEGER NOT NULL,
  amortization_method   TEXT NOT NULL DEFAULT 'french',
  term_months           INTEGER NOT NULL,
  start_date            TEXT NOT NULL,
  entity_id             TEXT,
  category              TEXT NOT NULL,
  is_active             INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE TABLE amortization_entries (
  id                    TEXT PRIMARY KEY,
  debt_id               TEXT NOT NULL REFERENCES long_term_debts(id) ON DELETE CASCADE,
  period_number         INTEGER NOT NULL,
  due_date              TEXT NOT NULL,
  payment_amount        INTEGER NOT NULL,
  principal_amount      INTEGER NOT NULL,
  interest_amount       INTEGER NOT NULL,
  remaining_principal   INTEGER NOT NULL,
  linked_movement_id    TEXT,
  partial_amount_paid   INTEGER,
  status                TEXT NOT NULL DEFAULT 'pending',
  UNIQUE(debt_id, period_number)
);

CREATE INDEX idx_amortization_entries_debt_id ON amortization_entries(debt_id);
CREATE INDEX idx_amortization_entries_due_date ON amortization_entries(due_date);
```

---

## Implementation Checklist

- [ ] Create `features/longTermDebts/types.ts`
- [ ] Create `features/longTermDebts/domain/amortization.ts` (pure TS, no React)
- [ ] Write unit tests: correct entry count, balance reaches zero, final payment absorbs rounding, `recomputeFromPeriod`, `findFirstOverdueEntry`
- [ ] Create SQLite migration for `long_term_debts` and `amortization_entries` tables
- [ ] Implement `storage/repositories/sqlite/SQLiteLongTermDebtRepository.ts`
- [ ] Implement `storage/repositories/interfaces/ILongTermDebtRepository.ts`
- [ ] Create `features/longTermDebts/screens/LongTermDebtListScreen.tsx`
- [ ] Create `features/longTermDebts/screens/LongTermDebtDetailScreen.tsx` (amortization table with FlatList)
- [ ] Create `features/longTermDebts/screens/AddLongTermDebtScreen.tsx` (with zod form validation)
- [ ] Create `features/longTermDebts/components/AmortizationEntryRow.tsx`
- [ ] Create `features/longTermDebts/components/ExtraPaymentSimulator.tsx`
- [ ] Add "Debts" tab or section to navigation
