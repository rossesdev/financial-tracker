# Feature 03: Financial Health Dashboard

A single-screen aggregated view of the user's overall financial health, with a score, key ratios, and drill-down capability.

**Depends on**: Features 01 (recurring debts) and 02 (long-term debts) for complete liability data. Can be implemented in a simplified form (movements only) before those features are ready.

**Target folder**: `features/dashboard/`

---

## Conceptual Design

The dashboard aggregates data from all domains (movements, recurring debts, long-term debts, goals, budgets) into:

1. A **health score** (0–100) computed from defined financial ratios.
2. A set of **key indicators** each with a benchmark, current value, and status (good/warning/critical).
3. **Net worth** (total assets minus total liabilities).

The snapshot is computed once, cached with a `computedAt` timestamp, and invalidated whenever any underlying data changes. It is **never computed in the render path** — always in a `useMemo`, `useEffect`, or background task.

---

## Data Structures

```ts
// features/dashboard/types.ts

type RatioStatus = 'good' | 'warning' | 'critical';

export interface IFinancialRatio {
  id: string;                        // e.g. 'savings_rate', 'debt_to_income'
  name: string;                      // display label
  value: number;
  benchmark: number;                 // target value (e.g. savings rate benchmark = 0.20)
  status: RatioStatus;
  description: string;               // plain-language explanation for the user
  improvementTip?: string;           // actionable advice when status is 'warning' or 'critical'
}

export interface IFinancialHealthSnapshot {
  computedAt: string;                // ISO 8601 — used for cache invalidation
  overallScore: number;              // 0–100
  netWorth: number;                  // total assets - total liabilities (integer cents)
  totalAssets: number;               // sum of all entity balances (integer cents)
  totalLiabilities: number;          // sum of remaining principals on long-term debts
  monthlyIncome: number;             // avg income over last 3 months (integer cents)
  monthlyExpenses: number;           // avg expenses over last 3 months (integer cents)
  monthlyDebtPayments: number;       // sum of monthly payments on active debts
  savingsRate: number;               // (income - expenses - debtPayments) / income
  debtToIncomeRatio: number;         // monthlyDebtPayments / monthlyIncome
  emergencyFundMonths: number;       // liquid assets / monthly expenses
  ratios: IFinancialRatio[];
}
```

---

## Health Calculator Domain Logic

```ts
// features/dashboard/domain/healthCalculator.ts
// Zero React imports — pure TypeScript

/**
 * Computes the full financial health snapshot from raw data.
 * All monetary inputs are integer cents.
 */
export function computeHealthSnapshot(params: {
  movements: IMovement[];
  longTermDebts: ILongTermDebt[];
  entityTotals: Record<string, number>; // entityId -> balance in cents
  today?: Date;
}): IFinancialHealthSnapshot {
  const { movements, longTermDebts, entityTotals, today = new Date() } = params;

  const totalAssets = Object.values(entityTotals).reduce((a, b) => a + b, 0);

  const totalLiabilities = longTermDebts
    .filter((d) => d.isActive)
    .reduce((sum, d) => sum + d.currentPrincipal, 0);

  const netWorth = totalAssets - totalLiabilities;

  // Average income and expenses over last 3 months
  const threeMonthsAgo = subMonths(today, 3);
  const recentMovements = movements.filter((m) => new Date(m.date) >= threeMonthsAgo);

  const totalIncome = recentMovements
    .filter((m) => m.typeOfMovement === '1')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalExpenses = recentMovements
    .filter((m) => m.typeOfMovement === '2')
    .reduce((sum, m) => sum + m.amount, 0);

  const monthlyIncome = Math.round(totalIncome / 3);
  const monthlyExpenses = Math.round(totalExpenses / 3);

  const monthlyDebtPayments = longTermDebts
    .filter((d) => d.isActive)
    .reduce((sum, d) => sum + d.monthlyPayment, 0);

  // Guard against division by zero
  const savingsRate = monthlyIncome > 0
    ? (monthlyIncome - monthlyExpenses - monthlyDebtPayments) / monthlyIncome
    : 0;

  const debtToIncomeRatio = monthlyIncome > 0
    ? monthlyDebtPayments / monthlyIncome
    : Infinity;

  const emergencyFundMonths = monthlyExpenses > 0
    ? totalAssets / monthlyExpenses
    : Infinity;

  const ratios = computeRatios({
    savingsRate,
    debtToIncomeRatio,
    emergencyFundMonths,
    netWorth,
  });

  const overallScore = computeOverallScore(ratios);

  return {
    computedAt: today.toISOString(),
    overallScore,
    netWorth,
    totalAssets,
    totalLiabilities,
    monthlyIncome,
    monthlyExpenses,
    monthlyDebtPayments,
    savingsRate,
    debtToIncomeRatio,
    emergencyFundMonths,
    ratios,
  };
}

function computeRatios(values: {
  savingsRate: number;
  debtToIncomeRatio: number;
  emergencyFundMonths: number;
  netWorth: number;
}): IFinancialRatio[] {
  const { savingsRate, debtToIncomeRatio, emergencyFundMonths, netWorth } = values;

  return [
    {
      id: 'savings_rate',
      name: 'Savings Rate',
      value: savingsRate,
      benchmark: 0.20,
      status: savingsRate >= 0.20 ? 'good' : savingsRate >= 0.10 ? 'warning' : 'critical',
      description: `You are saving ${(savingsRate * 100).toFixed(1)}% of your income. Target: 20%+.`,
      improvementTip: savingsRate < 0.10 ? 'Identify your top 3 expense categories and set budget limits for them.' : undefined,
    },
    {
      id: 'debt_to_income',
      name: 'Debt-to-Income Ratio',
      value: debtToIncomeRatio,
      benchmark: 0.35,
      status: debtToIncomeRatio <= 0.35 ? 'good' : debtToIncomeRatio <= 0.50 ? 'warning' : 'critical',
      description: `${(debtToIncomeRatio * 100).toFixed(1)}% of your monthly income goes to debt payments. Safe limit: 35%.`,
    },
    {
      id: 'emergency_fund',
      name: 'Emergency Fund',
      value: emergencyFundMonths,
      benchmark: 6,
      status: emergencyFundMonths >= 6 ? 'good' : emergencyFundMonths >= 3 ? 'warning' : 'critical',
      description: `Your liquid assets cover ${emergencyFundMonths.toFixed(1)} months of expenses. Target: 6+ months.`,
    },
    {
      id: 'net_worth',
      name: 'Net Worth',
      value: netWorth,
      benchmark: 0,
      status: netWorth >= 0 ? 'good' : 'critical',
      description: `Your assets exceed your debts by $${formatAmount(Math.abs(netWorth))}.`,
    },
  ];
}

function computeOverallScore(ratios: IFinancialRatio[]): number {
  const weights: Record<string, number> = {
    savings_rate: 0.30,
    debt_to_income: 0.30,
    emergency_fund: 0.25,
    net_worth: 0.15,
  };

  return Math.round(
    ratios.reduce((score, ratio) => {
      const weight = weights[ratio.id] ?? 0;
      const ratioScore = ratio.status === 'good' ? 100 : ratio.status === 'warning' ? 50 : 0;
      return score + ratioScore * weight;
    }, 0),
  );
}
```

---

## Edge Cases

| Case | Handling |
|---|---|
| No income recorded | `debtToIncomeRatio` and `savingsRate` set to `0` / `Infinity`. Show a prompt: "Add your income movements to see your health score." |
| New user with no history (<1 month of data) | Show an onboarding state instead of zeros. Do not show a health score until at least 30 days of data. |
| Negative entity balance | Include in `totalAssets` as-is (it is a real overdraft). Do not clamp to zero. |
| Long-term debts feature not yet implemented | `totalLiabilities = 0`, `monthlyDebtPayments = 0`. Clearly label these as "Not tracking long-term debts" in the UI. |
| Snapshot staleness | Re-compute whenever `movements`, `longTermDebts`, entity totals, goals, or budgets change. Use `computedAt` to display "Last updated X minutes ago." |

---

## UX Improvements

- **Color-coded score ring**: Circular gauge (0–100) with green (80–100), yellow (50–79), red (0–49).
- **Plain-language headline**: "Your finances are in good shape" / "Some areas need attention" / "Action required".
- **Month-over-month delta**: "+5 points this month" shown below the score.
- **Ratio cards**: Each ratio displayed as a card with a label, current value, benchmark, status indicator, and one-tap drill-down.
- **Drill-down**: Tapping a ratio shows the underlying movements that drive it (e.g., tapping "Savings Rate" shows income vs. expense movements for the last 3 months).
- **Onboarding checklist**: For new users, show a checklist: "Add your first income ✓", "Add an expense ✓", "Set up a budget □", "Add a savings goal □".

---

## Performance Risks

| Risk | Mitigation |
|---|---|
| Snapshot computation touches all domains | Must be computed outside the render path. Use `useMemo` with `[movements, longTermDebts, entityTotals]` as dependencies. For very large datasets, move to a `useEffect` with debounce. |
| Re-computes on every movement change | Accept this for now (it is correct). Profile with Flashlight at 1,000+ movements if lag appears. |
| Displaying many ratio cards | These are static UI cards, not a list. No virtualization needed. |

---

## Implementation Checklist

- [ ] Create `features/dashboard/types.ts`
- [ ] Create `features/dashboard/domain/healthCalculator.ts` (pure TS, no React)
- [ ] Write unit tests: correct score calculation, division-by-zero guards, ratio status thresholds
- [ ] Create `features/dashboard/hooks/useFinancialHealth.ts` (wraps `computeHealthSnapshot` in `useMemo`)
- [ ] Create `features/dashboard/components/HealthScoreCard.tsx` (circular gauge)
- [ ] Create `features/dashboard/components/RatioCard.tsx` (reusable per ratio)
- [ ] Create `features/dashboard/screens/DashboardScreen.tsx`
- [ ] Add "Dashboard" tab to `app/(tabs)/_layout.tsx`
- [ ] Handle the simplified pre-Feature-01/02 case (no liabilities data)
