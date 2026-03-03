import {
  computeTotalBalance,
  computeEntityBalance,
  computeEntityTotals,
  filterByPeriod,
} from '../movementCalculations';
import { IMovement } from '@/types/movements';

const now = new Date().toISOString();

const makeMovement = (overrides: Partial<IMovement> = {}): IMovement => ({
  id: 'test-1',
  description: 'Test',
  amount: 100_000,
  typeOfMovement: '1',
  category: '1',
  date: new Date(),
  entity: '1',
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('computeTotalBalance', () => {
  it('returns 0 for empty array', () => {
    expect(computeTotalBalance([])).toBe(0);
  });

  it('adds income movements', () => {
    const movements = [
      makeMovement({ amount: 500_000, typeOfMovement: '1' }),
      makeMovement({ amount: 300_000, typeOfMovement: '1' }),
    ];
    expect(computeTotalBalance(movements)).toBe(800_000);
  });

  it('subtracts expense movements', () => {
    const movements = [
      makeMovement({ amount: 500_000, typeOfMovement: '1' }),
      makeMovement({ amount: 200_000, typeOfMovement: '2' }),
    ];
    expect(computeTotalBalance(movements)).toBe(300_000);
  });

  it('handles negative net balance', () => {
    const movements = [makeMovement({ amount: 100_000, typeOfMovement: '2' })];
    expect(computeTotalBalance(movements)).toBe(-100_000);
  });
});

describe('computeEntityBalance', () => {
  it('only counts movements for the given entity', () => {
    const movements = [
      makeMovement({ entity: '1', amount: 500_000, typeOfMovement: '1' }),
      makeMovement({ entity: '2', amount: 200_000, typeOfMovement: '1' }),
      makeMovement({ entity: '1', amount: 100_000, typeOfMovement: '2' }),
    ];
    expect(computeEntityBalance(movements, '1')).toBe(400_000);
    expect(computeEntityBalance(movements, '2')).toBe(200_000);
  });

  it('returns 0 for unknown entity', () => {
    expect(computeEntityBalance([], '99')).toBe(0);
  });
});

describe('computeEntityTotals', () => {
  it('initializes all requested entityIds to 0', () => {
    const totals = computeEntityTotals([], ['1', '2', '3']);
    expect(totals).toEqual({ '1': 0, '2': 0, '3': 0 });
  });

  it('correctly computes totals across multiple entities', () => {
    const movements = [
      makeMovement({ entity: '1', amount: 1_000_000, typeOfMovement: '1' }),
      makeMovement({ entity: '1', amount: 200_000, typeOfMovement: '2' }),
      makeMovement({ entity: '2', amount: 500_000, typeOfMovement: '1' }),
    ];
    const totals = computeEntityTotals(movements, ['1', '2']);
    expect(totals['1']).toBe(800_000);
    expect(totals['2']).toBe(500_000);
  });

  it('ignores movements without entity', () => {
    const movements = [makeMovement({ entity: undefined, amount: 999_999, typeOfMovement: '1' })];
    const totals = computeEntityTotals(movements, ['1']);
    expect(totals['1']).toBe(0);
  });
});

describe('filterByPeriod', () => {
  const ref = new Date('2026-03-03T12:00:00Z');

  it('today: includes movements from today only', () => {
    const movements = [
      makeMovement({ date: new Date('2026-03-03T08:00:00Z') }),
      makeMovement({ date: new Date('2026-03-02T23:59:59Z') }),
    ];
    const result = filterByPeriod(movements, 'today', ref);
    expect(result).toHaveLength(1);
  });

  it('week: includes movements from last 7 days', () => {
    const movements = [
      makeMovement({ date: new Date('2026-02-28T00:00:00Z') }),
      makeMovement({ date: new Date('2026-02-20T00:00:00Z') }),
    ];
    const result = filterByPeriod(movements, 'week', ref);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no movements match', () => {
    const movements = [makeMovement({ date: new Date('2025-01-01') })];
    const result = filterByPeriod(movements, 'today', ref);
    expect(result).toHaveLength(0);
  });
});
