import { useEffect, useRef } from 'react';
import { useBudgetsStore } from '@/store/budgetsStore';
import { IBudgetStatus } from '../types';

/**
 * Monitors budgetStatuses and fires alerts when pendingAlerts is non-empty.
 * Returns the list of active (non-dismissed) alerts for rendering.
 */
export function useBudgetAlerts(): {
  activeAlertStatuses: IBudgetStatus[];
  dismissAlert: (alertId: string) => Promise<void>;
} {
  const { budgetStatuses, alerts, dismissAlert } = useBudgetsStore();

  // Filter statuses that have pending alerts or fired undismissed alerts
  const activeAlertStatuses = budgetStatuses.filter(
    (s) => s.pendingAlerts.length > 0 || s.firedAlerts.some((a) => !a.dismissed)
  );

  return { activeAlertStatuses, dismissAlert };
}
