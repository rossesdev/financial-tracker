# Feature 06: Cash Flow Forecasting

Project future account balances based on current balances, recurring income, recurring debts, and long-term debt payments.

**Depends on**: Feature 01 (recurring debts) and Feature 02 (long-term debts) for meaningful output. Can show a basic forecast from recurring debts alone.

**Target folder**: `features/forecast/`

---

## Conceptual Design

Cash flow forecasting is a **read-only, computed feature**. It does not persist any data — all output is derived at query time from:

1. Current entity balances (initial balance).
2. Scheduled recurring income and expenses (`IRecurringDebt` with type income/expense).
3. Scheduled long-term debt payments (`IAmortizationEntry` with upcoming due dates).
4. Optional: Goal contributions as outflows.

The forecast projects a daily, weekly, or monthly **rolling balance** for a chosen horizon (3 months default, up to 12 months).

**Key insight for the user**: The forecast reveals the first date the projected balance goes negative — a critical early warning for cash flow shortfalls.

---

## Data Structures

```ts
// features/forecast/types.ts

export interface IForecastEvent {
  label: string;                 // e.g. "Netflix", "Mortgage Payment", "Salary"
  amount: number;                // positive = income, negative = expense (integer cents)
  type: 'recurring' | 'debt_payment' | 'goal_contribution' | 'manual';
  sourceId: string;              // id of the source rule/debt/goal
  isEstimated: boolean;          // true for variable amounts
}

export interface IForecastEntry {
  date: string;                  // ISO 8601 — first day of the period
  openingBalance: number;        // balance at start of period (integer cents)
  projectedIncome: number;       // sum of income events (integer cents)
  projectedExpenses: number;     // sum of expense events (integer cents)
  netCashFlow: number;           // projectedIncome - projectedExpenses
  closingBalance: number;        // openingBalance + netCashFlow
  isNegative: boolean;           // closingBalance < 0
  events: IForecastEvent[];      // what drives this period's numbers
}

export interface ICashFlowForecast {
  startDate: string;             // ISO 8601
  endDate: string;               // ISO 8601
  periodType: 'daily' | 'weekly' | 'monthly';
  initialBalance: number;        // current total balance across all entities (integer cents)
  entries: IForecastEntry[];
  lowestProjectedBalance: number;
  lowestProjectedDate: string;   // when the lowest balance occurs
  firstNegativeDate?: string;    // first date balance goes negative (undefined if never)
  generatedAt: string;           // ISO 8601
}
```

---

## Forecast Engine Domain Logic

```ts
// features/forecast/domain/forecastEngine.ts
// Zero React imports — pure TypeScript

import { addDays, addWeeks, addMonths, eachDayOfInterval,
         eachWeekOfInterval, eachMonthOfInterval, startOfDay,
         isSameDay, isSameWeek, isSameMonth } from 'date-fns';

export function generateForecast(params: {
  initialBalance: number;
  recurringDebts: IRecurringDebt[];
  longTermDebts: ILongTermDebt[];
  goalContributions?: Array<{ label: string; amount: number; date: string; goalId: string }>;
  startDate: Date;
  horizonMonths: number;         // 1–12
  periodType: 'daily' | 'weekly' | 'monthly';
}): ICashFlowForecast {
  const { initialBalance, recurringDebts, longTermDebts, goalContributions = [],
          startDate, horizonMonths, periodType } = params;

  const endDate = addMonths(startDate, horizonMonths);

  const periods = periodType === 'daily'
    ? eachDayOfInterval({ start: startDate, end: endDate }).map(startOfDay)
    : periodType === 'weekly'
    ? eachWeekOfInterval({ start: startDate, end: endDate })
    : eachMonthOfInterval({ start: startDate, end: endDate });

  const isSamePeriod = periodType === 'daily' ? isSameDay
    : periodType === 'weekly' ? isSameWeek
    : isSameMonth;

  const entries: IForecastEntry[] = [];
  let runningBalance = initialBalance;

  for (const periodStart of periods) {
    const events: IForecastEvent[] = [];

    // Add recurring debt events that fall in this period
    for (const rule of recurringDebts) {
      if (!rule.isActive) continue;
      const nextDue = new Date(rule.nextDueDate);
      if (isSamePeriod(nextDue, periodStart)) {
        events.push({
          label: rule.name,
          amount: rule.autoPost || true ? -rule.amount : -rule.amount,  // recurring = expense
          type: 'recurring',
          sourceId: rule.id,
          isEstimated: rule.estimatedAmount,
        });
      }
    }

    // Add long-term debt payments that fall in this period
    for (const debt of longTermDebts) {
      if (!debt.isActive) continue;
      for (const entry of debt.amortizationTable) {
        if (entry.status !== 'paid' && isSamePeriod(new Date(entry.dueDate), periodStart)) {
          events.push({
            label: `${debt.name} payment`,
            amount: -entry.paymentAmount,
            type: 'debt_payment',
            sourceId: debt.id,
            isEstimated: false,
          });
        }
      }
    }

    // Add goal contributions as outflows
    for (const contrib of goalContributions) {
      if (isSamePeriod(new Date(contrib.date), periodStart)) {
        events.push({
          label: `Goal: ${contrib.label}`,
          amount: -contrib.amount,
          type: 'goal_contribution',
          sourceId: contrib.goalId,
          isEstimated: false,
        });
      }
    }

    const projectedIncome = events
      .filter((e) => e.amount > 0)
      .reduce((sum, e) => sum + e.amount, 0);

    const projectedExpenses = events
      .filter((e) => e.amount < 0)
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const netCashFlow = projectedIncome - projectedExpenses;
    const closingBalance = runningBalance + netCashFlow;

    entries.push({
      date: periodStart.toISOString(),
      openingBalance: runningBalance,
      projectedIncome,
      projectedExpenses,
      netCashFlow,
      closingBalance,
      isNegative: closingBalance < 0,
      events,
    });

    runningBalance = closingBalance;
  }

  const lowestEntry = entries.reduce(
    (min, e) => e.closingBalance < min.closingBalance ? e : min,
    entries[0],
  );

  const firstNegativeEntry = entries.find((e) => e.isNegative);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    periodType,
    initialBalance,
    entries,
    lowestProjectedBalance: lowestEntry.closingBalance,
    lowestProjectedDate: lowestEntry.date,
    firstNegativeDate: firstNegativeEntry?.date,
    generatedAt: new Date().toISOString(),
  };
}
```

---

## Edge Cases

| Case | Handling |
|---|---|
| Variable recurring amounts (utilities with `estimatedAmount: true`) | Use the rule's `amount` as the estimate. Mark the event with `isEstimated: true`. Display estimated values with a "~" prefix in the UI (e.g., "~$50.000"). |
| Goal contributions as outflows | Include only goals with a `targetDate` that falls within the forecast horizon and whose status is `active`. Distribute the `requiredMonthlySavings` as a monthly event. |
| Recurring debts and long-term payments on the same day | Both appear as separate events in the same period — do not consolidate. The user should see itemized events. |
| Negative projected balance | Set `isNegative: true` on the entry. Highlight in red in the UI. Show the `firstNegativeDate` prominently as an alert. |
| No recurring debts or debts added yet | Generate a flat forecast showing only the current balance for all periods with a message: "Add recurring debts to see meaningful projections." |
| Recurring rule with `nextDueDate` beyond the forecast horizon | Exclude it from the forecast — it doesn't affect the projected period. |
| Multi-entity forecast | The `initialBalance` is the sum of all entity balances. Per-entity forecasting (which account will go negative?) is a future enhancement. |

---

## UX Improvements

- **3-month rolling view** as the default with 6-month and 12-month toggle options.
- **Waterfall/line chart**: X-axis = time periods, Y-axis = projected balance. A horizontal dashed line at 0 makes it easy to spot when the balance crosses into negative territory.
- **Negative periods highlighted**: Bars or data points below zero are shown in red.
- **Alert card**: If `firstNegativeDate` is defined, show a prominent warning card at the top: "Your balance is projected to go negative on [date]. Consider reviewing your recurring expenses."
- **Event details on tap**: Tapping a period in the chart expands a list of the `IForecastEvent[]` items for that period — shows what drives that period's cash flow.
- **"What if" toggle**: For each recurring event, a toggle in the expanded view lets the user disable it temporarily to see the impact on the forecast. This is a read-only simulation — it does not modify the actual rule.
- **Estimated amounts labeled clearly**: Items with `isEstimated: true` show a "~" prefix and a "Estimated" badge.

---

## Performance Risks

| Risk | Mitigation |
|---|---|
| Generating a 365-day daily forecast iterates all recurring rules for each day | Cache the result in state and invalidate only when `recurringDebts`, `longTermDebts`, or entity balances change. Debounce the recomputation by 500ms to avoid recomputing on every keystroke. |
| Never compute the forecast in the render path | Compute in `useEffect` and store the result in `store/forecastStore.ts`. The chart component receives only the precomputed `ICashFlowForecast`. |
| Amortization table for 360-month mortgage: iterating all entries per period | Pre-index amortization entries by month before running the forecast loop: `Map<monthKey, IAmortizationEntry[]>`. |

---

## Implementation Checklist

- [ ] Create `features/forecast/types.ts`
- [ ] Create `features/forecast/domain/forecastEngine.ts` (pure TS, no React)
- [ ] Write unit tests: flat forecast with no rules, negative balance detection, variable amount handling, multi-debt periods
- [ ] Create `features/forecast/hooks/useForecast.ts` (runs `generateForecast` in `useEffect`, stores in `forecastStore`)
- [ ] Add `forecastStore.ts` to `store/`
- [ ] Create `features/forecast/components/ForecastChart.tsx` (line chart of projected balance)
- [ ] Create `features/forecast/components/ForecastPeriodDetail.tsx` (event breakdown on tap)
- [ ] Create `features/forecast/components/NegativeBalanceAlert.tsx`
- [ ] Create `features/forecast/screens/ForecastScreen.tsx`
- [ ] Add "Forecast" section to the Dashboard or a dedicated tab
