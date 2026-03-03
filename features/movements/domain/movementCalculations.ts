import { IMovement } from '@/types/movements';

/** Sum all movements: income adds, expense subtracts. Returns integer cents. */
export function computeTotalBalance(movements: IMovement[]): number {
  return movements.reduce((total, m) => {
    return m.typeOfMovement === '1'
      ? total + m.amount
      : total - m.amount;
  }, 0);
}

/** Compute balance for a specific entity by id. */
export function computeEntityBalance(movements: IMovement[], entityId: string): number {
  return movements
    .filter((m) => m.entity === entityId)
    .reduce((total, m) => {
      return m.typeOfMovement === '1'
        ? total + m.amount
        : total - m.amount;
    }, 0);
}

/** Build a map of entityId → balance for all entities. */
export function computeEntityTotals(
  movements: IMovement[],
  entityIds: string[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  entityIds.forEach((id) => { totals[id] = 0; });
  movements.forEach((m) => {
    if (!m.entity) return;
    const key = m.entity.toString();
    const delta = m.typeOfMovement === '2' ? -Math.abs(m.amount) : m.amount;
    totals[key] = (totals[key] ?? 0) + delta;
  });
  return totals;
}

/** Filter movements to a period relative to `now`. */
export function filterByPeriod(
  movements: IMovement[],
  period: 'today' | 'week' | 'month',
  now: Date = new Date()
): IMovement[] {
  const start = new Date(now);
  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMonth(now.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
  }
  return movements.filter((m) => new Date(m.date) >= start);
}
