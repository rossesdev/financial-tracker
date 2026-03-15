import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
  getWeek,
  getYear,
  getQuarter,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { IBudget, IBudgetAlert, IBudgetStatus, AlertThreshold, BudgetPeriod } from '../types';
import { IMovement } from '@/types/movements';

export interface PeriodBounds {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Returns the start/end dates and a string label for the current budget period.
 */
export function getCurrentPeriodBounds(period: BudgetPeriod, today: Date): PeriodBounds {
  switch (period) {
    case 'weekly': {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = endOfWeek(today, { weekStartsOn: 1 });
      const week = String(getWeek(today, { weekStartsOn: 1 })).padStart(2, '0');
      return { start, end, label: `${getYear(today)}-W${week}` };
    }
    case 'monthly': {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return { start, end, label: format(today, 'yyyy-MM') };
    }
    case 'quarterly': {
      const start = startOfQuarter(today);
      const end = endOfQuarter(today);
      return { start, end, label: `${getYear(today)}-Q${getQuarter(today)}` };
    }
    case 'annual': {
      const start = startOfYear(today);
      const end = endOfYear(today);
      return { start, end, label: String(getYear(today)) };
    }
  }
}

/**
 * Evaluates a budget against movements and existing alerts.
 * Budget status is always derived — never stored.
 *
 * @param budget - The budget definition
 * @param allMovements - All movements (will be filtered to period + category/entity)
 * @param firedAlerts - Alerts already fired for this budget in any period
 * @param priorPeriodRemaining - Rollover amount from the prior period (0 if not applicable)
 * @param today - Reference date (injectable for testability)
 */
export function evaluateBudget(
  budget: IBudget,
  allMovements: IMovement[],
  firedAlerts: IBudgetAlert[],
  priorPeriodRemaining: number,
  today: Date
): IBudgetStatus {
  const { start, end, label } = getCurrentPeriodBounds(budget.period, today);

  // Filter movements to this period and matching categories/entities
  const relevantMovements = allMovements.filter((m) => {
    const movDate = m.date instanceof Date ? m.date : parseISO(m.date as unknown as string);
    if (!isWithinInterval(movDate, { start, end })) return false;
    if (m.typeOfMovement !== '2') return false; // expenses only
    if (!budget.categoryIds.includes(m.category)) return false;
    if (budget.entityIds && budget.entityIds.length > 0) {
      if (!m.entity || !budget.entityIds.includes(m.entity)) return false;
    }
    return true;
  });

  const spentAmount = relevantMovements.reduce((sum, m) => sum + m.amount, 0);

  // Compute rollover cap
  let rolloverAmount = 0;
  if (budget.rollover && priorPeriodRemaining > 0) {
    rolloverAmount =
      budget.rolloverCap !== undefined
        ? Math.min(priorPeriodRemaining, budget.rolloverCap)
        : priorPeriodRemaining;
  }

  const effectiveLimitAmount = budget.limitAmount + rolloverAmount;
  const remainingAmount = effectiveLimitAmount - spentAmount;
  const usagePercentage =
    effectiveLimitAmount > 0 ? spentAmount / effectiveLimitAmount : 0;

  // Determine status
  let status: IBudgetStatus['status'] = 'ok';
  if (usagePercentage >= 1.0) {
    status = 'exceeded';
  } else if (usagePercentage >= 0.75) {
    status = 'warning';
  }

  // Determine already-fired alerts for this period
  const firedForPeriod = firedAlerts.filter(
    (a) => a.budgetId === budget.id && a.periodLabel === label && !a.dismissed
  );
  const firedThresholds = new Set(firedForPeriod.map((a) => a.threshold));

  // Compute pending (not yet fired) thresholds that have now been crossed
  const pendingAlerts: AlertThreshold[] = budget.alertThresholds.filter((threshold) => {
    if (firedThresholds.has(threshold)) return false;
    return usagePercentage >= threshold;
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
    firedAlerts: firedForPeriod,
  };
}
