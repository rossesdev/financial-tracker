# Feature 04: Analytics & Visual Insights

Time-series charts, category breakdowns, and entity flow analysis over user-selected periods.

**Depends on**: Sprint 1–4 complete (especially integer `amount` and SQLite). The `FinanceLineChart` component already exists in `components/charts/FinanceLineChart.tsx` but is commented out — this feature activates and expands it.

**Target folder**: `features/analytics/`

---

## Conceptual Design

Analytics requires time-series data aggregated by various dimensions (category, entity, time period). The primary challenge is that chart data must be **precomputed** — feeding raw movements directly into a chart component means O(n) computation in the render path on every re-render.

The correct pattern:
1. Aggregate raw movements into an `IAnalyticsReport` shape **outside the render path** (in `useMemo` or `useEffect` with debounce).
2. Pass only the precomputed report to chart components.
3. Cache the report with a `computedAt` timestamp; invalidate when movements or the selected period changes.

---

## Data Structures

```ts
// features/analytics/types.ts

export interface ITimeSeriesPoint {
  date: string;                  // ISO 8601, first day of the period
  income: number;                // integer cents
  expenses: number;              // integer cents
  net: number;                   // income - expenses (can be negative)
}

export interface ICategoryBreakdown {
  categoryId: string;
  categoryLabel: string;
  totalAmount: number;           // integer cents
  percentage: number;            // 0–100
  movementCount: number;
}

export interface IEntityFlow {
  entityId: string;
  entityName: string;
  totalInflow: number;           // integer cents
  totalOutflow: number;          // integer cents
  netFlow: number;               // inflow - outflow
}

export interface IAnalyticsReport {
  period: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate: string;             // ISO 8601
  endDate: string;               // ISO 8601
  granularity: 'daily' | 'weekly' | 'monthly';
  timeSeries: ITimeSeriesPoint[];
  expenseCategoryBreakdown: ICategoryBreakdown[];
  incomeCategoryBreakdown: ICategoryBreakdown[];
  entityBreakdown: IEntityFlow[];
  totalIncome: number;           // integer cents
  totalExpenses: number;         // integer cents
  netCashFlow: number;
  averageMonthlyExpenses: number;
  computedAt: string;            // ISO 8601
}
```

---

## Analytics Aggregator Domain Logic

```ts
// features/analytics/domain/analyticsAggregator.ts
// Zero React imports — pure TypeScript

import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
         isSameDay, isSameWeek, isSameMonth, startOfDay, startOfWeek, startOfMonth } from 'date-fns';

/**
 * Builds a complete analytics report from a filtered set of movements.
 * All monetary values in the output are integer cents.
 *
 * @param movements  - Already filtered to the desired date range
 * @param startDate  - Report period start
 * @param endDate    - Report period end
 * @param granularity - Time axis resolution
 * @param categoryLabels - Map from categoryId to display label
 * @param entityNames    - Map from entityId to display name
 */
export function buildAnalyticsReport(params: {
  movements: IMovement[];
  startDate: Date;
  endDate: Date;
  granularity: 'daily' | 'weekly' | 'monthly';
  categoryLabels: Record<string, string>;
  entityNames: Record<string, string>;
}): IAnalyticsReport {
  const { movements, startDate, endDate, granularity, categoryLabels, entityNames } = params;

  const timeSeries = buildTimeSeries(movements, startDate, endDate, granularity);
  const expenses = movements.filter((m) => m.typeOfMovement === '2');
  const income = movements.filter((m) => m.typeOfMovement === '1');

  const totalExpenses = expenses.reduce((sum, m) => sum + m.amount, 0);
  const totalIncome = income.reduce((sum, m) => sum + m.amount, 0);

  return {
    period: 'custom',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    granularity,
    timeSeries,
    expenseCategoryBreakdown: buildCategoryBreakdown(expenses, totalExpenses, categoryLabels),
    incomeCategoryBreakdown: buildCategoryBreakdown(income, totalIncome, categoryLabels),
    entityBreakdown: buildEntityBreakdown(movements, entityNames),
    totalIncome,
    totalExpenses,
    netCashFlow: totalIncome - totalExpenses,
    averageMonthlyExpenses: computeAverageMonthly(expenses, startDate, endDate),
    computedAt: new Date().toISOString(),
  };
}

function buildTimeSeries(
  movements: IMovement[],
  startDate: Date,
  endDate: Date,
  granularity: 'daily' | 'weekly' | 'monthly',
): ITimeSeriesPoint[] {
  // Generate all period buckets — ensures zero-value points appear (no gaps)
  const periods = granularity === 'daily'
    ? eachDayOfInterval({ start: startDate, end: endDate }).map(startOfDay)
    : granularity === 'weekly'
    ? eachWeekOfInterval({ start: startDate, end: endDate }).map(startOfWeek)
    : eachMonthOfInterval({ start: startDate, end: endDate }).map(startOfMonth);

  const isSamePeriod = granularity === 'daily' ? isSameDay
    : granularity === 'weekly' ? isSameWeek
    : isSameMonth;

  return periods.map((periodStart) => {
    const periodMovements = movements.filter((m) =>
      isSamePeriod(new Date(m.date), periodStart),
    );
    const income = periodMovements
      .filter((m) => m.typeOfMovement === '1')
      .reduce((sum, m) => sum + m.amount, 0);
    const expenses = periodMovements
      .filter((m) => m.typeOfMovement === '2')
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      date: periodStart.toISOString(),
      income,
      expenses,
      net: income - expenses,
    };
  });
}

function buildCategoryBreakdown(
  movements: IMovement[],
  total: number,
  categoryLabels: Record<string, string>,
): ICategoryBreakdown[] {
  const grouped: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const m of movements) {
    grouped[m.category] = (grouped[m.category] ?? 0) + m.amount;
    counts[m.category] = (counts[m.category] ?? 0) + 1;
  }

  return Object.entries(grouped)
    .map(([categoryId, totalAmount]) => ({
      categoryId,
      categoryLabel: categoryLabels[categoryId] ?? categoryId,
      totalAmount,
      percentage: total > 0 ? Math.round((totalAmount / total) * 100) : 0,
      movementCount: counts[categoryId] ?? 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

function buildEntityBreakdown(
  movements: IMovement[],
  entityNames: Record<string, string>,
): IEntityFlow[] {
  const inflow: Record<string, number> = {};
  const outflow: Record<string, number> = {};

  for (const m of movements) {
    if (!m.entity) continue;
    if (m.typeOfMovement === '1') {
      inflow[m.entity] = (inflow[m.entity] ?? 0) + m.amount;
    } else {
      outflow[m.entity] = (outflow[m.entity] ?? 0) + m.amount;
    }
  }

  const entityIds = new Set([...Object.keys(inflow), ...Object.keys(outflow)]);

  return Array.from(entityIds).map((entityId) => ({
    entityId,
    entityName: entityNames[entityId] ?? entityId,
    totalInflow: inflow[entityId] ?? 0,
    totalOutflow: outflow[entityId] ?? 0,
    netFlow: (inflow[entityId] ?? 0) - (outflow[entityId] ?? 0),
  }));
}

function computeAverageMonthly(
  expenses: IMovement[],
  startDate: Date,
  endDate: Date,
): number {
  const months = Math.max(
    1,
    eachMonthOfInterval({ start: startDate, end: endDate }).length,
  );
  const total = expenses.reduce((sum, m) => sum + m.amount, 0);
  return Math.round(total / months);
}
```

---

## Chart Library Recommendation

| Option | Pros | Cons |
|---|---|---|
| `react-native-chart-kit` (current) | Already installed | Known performance issues above 50 data points; limited customization |
| `victory-native` | Mature, good docs, flexible | Heavier bundle |
| `react-native-gifted-charts` | Lightweight, good RN support, easy to use | Less community documentation |
| `react-native-skia` (custom) | Maximum performance, 60fps on large datasets | High implementation effort |

**Recommendation**: Replace `react-native-chart-kit` with `react-native-gifted-charts` for the initial release. Migrate to Skia-based rendering only if performance profiling reveals actual frame drops.

---

## Edge Cases

| Case | Handling |
|---|---|
| Periods with no movements | `buildTimeSeries` generates zero-value data points for all periods. Charts must render zero-value points as explicit zeros, not as gaps. |
| Very large numbers on chart axes | Use K/M suffixes: `formatAxisValue(v) => v >= 1_000_000 ? '${v/1_000_000}M' : v >= 1_000 ? '${v/1_000}K' : String(v)` |
| Single-day selected range with 'monthly' granularity | Clamp granularity to 'daily' when the selected range is less than 7 days. |
| All movements in one category | The category breakdown shows 100% in one slice — valid, display as-is. |
| Custom date range spanning years | Use 'monthly' granularity automatically for ranges > 90 days; use 'weekly' for 30–90 days; use 'daily' for < 30 days. |

---

## UX Improvements

- **Period selector**: Segmented control (Week / Month / Quarter / Year / Custom). Smooth data transition animation between periods.
- **Chart type toggle**: Line chart (income vs. expenses over time) and pie/donut chart (category breakdown) — toggle between them.
- **Tap to drill in**: Tapping a bar segment or pie slice filters the movement list below the chart to show only the matching movements.
- **Export chart as image**: Via `react-native-view-shot` — long-press on a chart to share or save.
- **Comparison mode**: "vs. last month" delta labels on category breakdown items.

---

## Performance Risks

| Risk | Mitigation |
|---|---|
| O(n) aggregation on every render | Wrap `buildAnalyticsReport` in `useMemo` with `[movements, startDate, endDate, granularity]` as dependencies. |
| Large datasets (1,000+ movements) | Profile with Flashlight. If `useMemo` is not enough, move computation to `useEffect` with a 300ms debounce after the last state change. |
| Chart re-renders on unrelated state changes | Wrap chart components in `React.memo`. Pass only the precomputed `IAnalyticsReport`, not raw movements. |
| Daily granularity over a full year (365 data points) | Cap daily granularity at 90 days maximum. For longer ranges, force weekly or monthly. |

---

## Implementation Checklist

- [ ] Create `features/analytics/types.ts`
- [ ] Create `features/analytics/domain/analyticsAggregator.ts` (pure TS, no React)
- [ ] Write unit tests: zero-value period gaps, correct percentage calculation, edge cases for empty movements
- [ ] Create `features/analytics/hooks/useAnalyticsReport.ts` (wraps `buildAnalyticsReport` in `useMemo`)
- [ ] Install `react-native-gifted-charts` (or chosen charting library)
- [ ] Remove commented-out `FinanceLineChart` import from `app/(tabs)/index.tsx`
- [ ] Rewrite `components/charts/FinanceLineChart.tsx` using the new library
- [ ] Create `features/analytics/components/charts/IncomeExpenseChart.tsx` (line/bar)
- [ ] Create `features/analytics/components/charts/CategoryPieChart.tsx` (donut)
- [ ] Create `features/analytics/components/PeriodSelector.tsx`
- [ ] Create `features/analytics/screens/AnalyticsScreen.tsx`
- [ ] Add "Analytics" tab to `app/(tabs)/_layout.tsx`
