import {
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  format,
  getWeek,
  getYear,
  getQuarter,
  parseISO,
  isAfter,
  isBefore,
  isEqual,
} from 'date-fns';
import { IRecurringDebt, IRecurringMovementLink, RecurrenceFrequency } from '../types';

/**
 * Advances the nextDueDate forward by one recurrence interval.
 */
export function advanceNextDueDate(
  currentDueDate: Date,
  frequency: RecurrenceFrequency
): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(currentDueDate, 1);
    case 'biweekly':
      return addWeeks(currentDueDate, 2);
    case 'monthly':
      return addMonths(currentDueDate, 1);
    case 'quarterly':
      return addQuarters(currentDueDate, 1);
    case 'annual':
      return addYears(currentDueDate, 1);
  }
}

/**
 * Computes a deduplication key for a given date and frequency.
 * Examples: "2026-02" (monthly), "2026-W07" (weekly), "2026-Q1" (quarterly), "2026" (annual)
 */
export function computePeriodLabel(date: Date, frequency: RecurrenceFrequency): string {
  switch (frequency) {
    case 'weekly':
    case 'biweekly': {
      const week = String(getWeek(date)).padStart(2, '0');
      return `${getYear(date)}-W${week}`;
    }
    case 'monthly':
      return format(date, 'yyyy-MM');
    case 'quarterly':
      return `${getYear(date)}-Q${getQuarter(date)}`;
    case 'annual':
      return String(getYear(date));
  }
}

/**
 * Returns rules that are due (nextDueDate <= today) and not already posted for that period.
 * Also handles back-filling missed periods by returning them all.
 */
export function getDueRules(
  rules: IRecurringDebt[],
  existingLinks: IRecurringMovementLink[],
  today: Date
): IRecurringDebt[] {
  const linksSet = new Set(
    existingLinks.map((l) => `${l.recurringDebtId}::${l.periodLabel}`)
  );

  return rules.filter((rule) => {
    if (!rule.isActive) return false;

    // Auto-deactivate if endDate is in the past
    if (rule.endDate) {
      const end = parseISO(rule.endDate);
      if (isBefore(end, today)) return false;
    }

    const due = parseISO(rule.nextDueDate);
    const isDue = isBefore(due, today) || isEqual(due, today);
    if (!isDue) return false;

    const periodLabel = computePeriodLabel(due, rule.frequency);
    const alreadyPosted = linksSet.has(`${rule.id}::${periodLabel}`);
    return !alreadyPosted;
  });
}

/**
 * Given a rule whose nextDueDate is in the past, collect all missed period labels
 * between nextDueDate and today (inclusive), for back-filling.
 */
export function getMissedPeriods(
  rule: IRecurringDebt,
  existingLinks: IRecurringMovementLink[],
  today: Date
): { date: Date; periodLabel: string }[] {
  const postedLabels = new Set(
    existingLinks
      .filter((l) => l.recurringDebtId === rule.id)
      .map((l) => l.periodLabel)
  );

  const periods: { date: Date; periodLabel: string }[] = [];
  let cursor = parseISO(rule.nextDueDate);

  while (isBefore(cursor, today) || isEqual(cursor, today)) {
    const label = computePeriodLabel(cursor, rule.frequency);
    if (!postedLabels.has(label)) {
      periods.push({ date: new Date(cursor), periodLabel: label });
    }
    const next = advanceNextDueDate(cursor, rule.frequency);
    // Prevent infinite loop if advance doesn't move forward
    if (isEqual(next, cursor) || isBefore(next, cursor)) break;
    cursor = next;
  }

  return periods;
}
