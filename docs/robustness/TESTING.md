# Testing Strategy

Zero test coverage is the highest-risk technical debt in this project. Every refactoring task in the sprint plan is significantly riskier without tests. This document defines the full testing strategy.

---

## Testing Pyramid

```
        ┌─────────┐
        │   E2E   │  (Maestro — user flows)
        ├─────────┤
        │ Component│  (React Native Testing Library)
        ├─────────┤
        │Integration│  (Jest + in-memory SQLite)
        ├─────────┤
        │  Unit   │  ← START HERE (domain layer, pure TS)
        └─────────┘
```

Start from the bottom. The domain layer has the highest ROI for tests — pure TypeScript functions with no framework dependencies, trivially testable, and covering the most critical financial logic.

---

## 1. Unit Tests — Domain Layer

**Tool**: Jest + `ts-jest`

**Installation**:
```bash
npm install --save-dev jest ts-jest @types/jest
```

**`jest.config.ts`**:
```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
```

**Priority files to test first** (in order of financial criticality):

### 1.1 Amount Parsing & Formatting
```ts
// shared/utils/__tests__/formatCurrency.test.ts
import { parseAmount, formatAmount } from '../formatCurrency';

describe('parseAmount', () => {
  it('parses a Colombian peso formatted string to integer cents', () => {
    expect(parseAmount('1.500.000', 'es-CO')).toBe(1500000);
  });

  it('handles zero', () => {
    expect(parseAmount('0', 'es-CO')).toBe(0);
  });

  it('throws on non-numeric input', () => {
    expect(() => parseAmount('abc', 'es-CO')).toThrow();
  });

  it('handles plain unformatted numbers', () => {
    expect(parseAmount('150000', 'es-CO')).toBe(150000);
  });
});

describe('formatAmount', () => {
  it('formats integer cents to display string', () => {
    expect(formatAmount(1500000, 'es-CO')).toBe('1.500.000');
  });

  it('formats zero', () => {
    expect(formatAmount(0, 'es-CO')).toBe('0');
  });
});
```

### 1.2 Amortization
```ts
// features/longTermDebts/domain/__tests__/amortization.test.ts
import { computeFrenchAmortizationTable, recomputeFromPeriod, computeTotalInterestCost } from '../amortization';

describe('computeFrenchAmortizationTable', () => {
  it('produces the correct number of entries', () => {
    const table = computeFrenchAmortizationTable(10_000_000, 0.12, 12, new Date('2026-01-01'));
    expect(table).toHaveLength(12);
  });

  it('final entry should bring remaining principal to zero', () => {
    const table = computeFrenchAmortizationTable(10_000_000, 0.12, 12, new Date('2026-01-01'));
    expect(table[11].remainingPrincipal).toBe(0);
  });

  it('sum of principal amounts equals original principal', () => {
    const principal = 10_000_000;
    const table = computeFrenchAmortizationTable(principal, 0.12, 12, new Date('2026-01-01'));
    const totalPrincipal = table.reduce((sum, e) => sum + e.principalAmount, 0);
    expect(totalPrincipal).toBe(principal);
  });

  it('throws on non-positive principal', () => {
    expect(() => computeFrenchAmortizationTable(0, 0.12, 12, new Date())).toThrow();
    expect(() => computeFrenchAmortizationTable(-1, 0.12, 12, new Date())).toThrow();
  });

  it('each payment amount equals principal + interest for that period', () => {
    const table = computeFrenchAmortizationTable(10_000_000, 0.12, 12, new Date('2026-01-01'));
    // Verify for first 11 entries (last entry may differ due to rounding)
    for (let i = 0; i < 11; i++) {
      expect(table[i].paymentAmount).toBe(table[i].principalAmount + table[i].interestAmount);
    }
  });
});
```

### 1.3 Budget Evaluator
```ts
// features/budgets/domain/__tests__/budgetEvaluator.test.ts
import { evaluateBudget, getCurrentPeriodBounds } from '../budgetEvaluator';

describe('evaluateBudget', () => {
  const mockBudget: IBudget = {
    id: '1',
    name: 'Food',
    categoryIds: ['1'],
    limitAmount: 500_000,
    period: 'monthly',
    alertThresholds: [0.8, 1.0],
    isActive: true,
    rollover: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('computes correct usage percentage', () => {
    const movements = [
      { id: '1', amount: 300_000, typeOfMovement: '2', category: '1', date: '2026-02-15', description: '', entity: '' },
    ] as IMovement[];

    const status = evaluateBudget(mockBudget, movements, [], 0, new Date('2026-02-20'));
    expect(status.spentAmount).toBe(300_000);
    expect(status.usagePercentage).toBe(60);
    expect(status.status).toBe('ok');
  });

  it('returns exceeded status when over 100%', () => {
    const movements = [
      { id: '1', amount: 600_000, typeOfMovement: '2', category: '1', date: '2026-02-15', description: '', entity: '' },
    ] as IMovement[];

    const status = evaluateBudget(mockBudget, movements, [], 0, new Date('2026-02-20'));
    expect(status.status).toBe('exceeded');
    expect(status.usagePercentage).toBe(120);
  });

  it('fires 80% alert when threshold is crossed', () => {
    const movements = [
      { id: '1', amount: 450_000, typeOfMovement: '2', category: '1', date: '2026-02-15', description: '', entity: '' },
    ] as IMovement[];

    const status = evaluateBudget(mockBudget, movements, [], 0, new Date('2026-02-20'));
    expect(status.pendingAlerts).toContain(0.8);
  });

  it('does not re-fire already-dismissed alerts', () => {
    const firedAlert: IBudgetAlert = {
      id: 'a1', budgetId: '1', threshold: 0.8,
      periodLabel: '2026-02', triggeredAt: new Date().toISOString(),
      actualAmount: 450_000, budgetAmount: 500_000, dismissed: false,
    };
    const movements = [
      { id: '1', amount: 450_000, typeOfMovement: '2', category: '1', date: '2026-02-15', description: '', entity: '' },
    ] as IMovement[];

    const status = evaluateBudget(mockBudget, movements, [firedAlert], 0, new Date('2026-02-20'));
    expect(status.pendingAlerts).not.toContain(0.8);
  });

  it('applies rollover amount to effective limit', () => {
    const rolloverBudget = { ...mockBudget, rollover: true };
    const status = evaluateBudget(rolloverBudget, [], [], 100_000, new Date('2026-02-20'));
    expect(status.effectiveLimitAmount).toBe(600_000);
  });
});
```

### 1.4 Recurring Debt Scheduler
```ts
// features/recurringDebts/domain/__tests__/recurringDebtScheduler.test.ts
import { getDueRules, computePeriodLabel, advanceNextDueDate } from '../recurringDebtScheduler';

describe('advanceNextDueDate', () => {
  it('advances monthly rule from Jan 31 to Feb 28 (not Feb 31)', () => {
    const jan31 = new Date('2026-01-31');
    const result = advanceNextDueDate(jan31, 'monthly');
    expect(result.getDate()).toBe(28);
    expect(result.getMonth()).toBe(1); // February
  });

  it('advances weekly rule by exactly 7 days', () => {
    const date = new Date('2026-02-01');
    const result = advanceNextDueDate(date, 'weekly');
    expect(result.toDateString()).toBe(new Date('2026-02-08').toDateString());
  });
});

describe('getDueRules', () => {
  it('returns only active rules past their due date', () => {
    const rules: IRecurringDebt[] = [
      { id: '1', name: 'Netflix', amount: 49_900, category: '1', frequency: 'monthly',
        startDate: '2026-01-01', nextDueDate: '2026-02-15', isActive: true,
        autoPost: true, estimatedAmount: false, createdAt: '', updatedAt: '' },
      { id: '2', name: 'Paused', amount: 10_000, category: '1', frequency: 'monthly',
        startDate: '2026-01-01', nextDueDate: '2026-02-10', isActive: false,
        autoPost: true, estimatedAmount: false, createdAt: '', updatedAt: '' },
    ];

    const result = getDueRules(rules, [], new Date('2026-02-20'));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});
```

### 1.5 Financial Health Calculator
```ts
// features/dashboard/domain/__tests__/healthCalculator.test.ts
import { computeHealthSnapshot } from '../healthCalculator';

describe('computeHealthSnapshot', () => {
  it('handles zero income without throwing (division by zero guard)', () => {
    expect(() => computeHealthSnapshot({
      movements: [],
      longTermDebts: [],
      entityTotals: { '1': 1_000_000 },
    })).not.toThrow();
  });

  it('computes net worth correctly', () => {
    const snapshot = computeHealthSnapshot({
      movements: [],
      longTermDebts: [{ id: '1', currentPrincipal: 200_000_000, isActive: true } as ILongTermDebt],
      entityTotals: { '1': 500_000_000 },
    });
    expect(snapshot.netWorth).toBe(300_000_000);
    expect(snapshot.totalAssets).toBe(500_000_000);
    expect(snapshot.totalLiabilities).toBe(200_000_000);
  });
});
```

---

## 2. Integration Tests — Repository Layer

**Tool**: Jest + `better-sqlite3` (for Node.js in-memory SQLite testing, without Expo runtime)

```bash
npm install --save-dev better-sqlite3 @types/better-sqlite3
```

Test that SQLite repositories persist and retrieve data correctly, handle schema migrations without data loss, and handle concurrent writes.

```ts
// storage/repositories/sqlite/__tests__/SQLiteMovementRepository.test.ts
import Database from 'better-sqlite3';
import { SQLiteMovementRepository } from '../SQLiteMovementRepository';

describe('SQLiteMovementRepository', () => {
  let repo: SQLiteMovementRepository;

  beforeEach(() => {
    const db = new Database(':memory:');
    // Run v1 migration
    db.exec(`CREATE TABLE movements (...)`);
    repo = new SQLiteMovementRepository(db as any);
  });

  it('saves and retrieves a movement', async () => {
    const movement: IMovement = {
      id: 'test-1',
      description: 'Groceries',
      amount: 50_000,
      typeOfMovement: '2',
      category: '1',
      date: '2026-02-20',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repo.save(movement);
    const retrieved = await repo.getById('test-1');
    expect(retrieved).toEqual(movement);
  });

  it('returns null for non-existent id', async () => {
    const result = await repo.getById('non-existent');
    expect(result).toBeNull();
  });

  it('deletes a movement', async () => {
    const movement = { id: 'del-1', /* ... */ } as IMovement;
    await repo.save(movement);
    await repo.delete('del-1');
    expect(await repo.getById('del-1')).toBeNull();
  });
});
```

---

## 3. Component Tests

**Tool**: React Native Testing Library (`@testing-library/react-native`)

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

Focus on:
- Form validation: correct error messages appear for invalid input.
- Filter state changes propagate to list rendering.
- Budget status colors render correctly based on usage percentage.
- Empty states render when no data is present.

```ts
// features/movements/components/__tests__/MovementListItem.test.tsx
import { render, screen } from '@testing-library/react-native';
import { MovementListItem } from '../MovementListItem';

it('displays formatted amount in Colombian peso format', () => {
  const movement: IMovement = {
    id: '1', description: 'Groceries', amount: 1_500_000,
    typeOfMovement: '2', category: '1', date: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  render(<MovementListItem movement={movement} onPress={() => {}} />);
  expect(screen.getByText('$1.500.000')).toBeTruthy();
});

it('shows income in green and expense in red', () => {
  const income = { ...mockMovement, typeOfMovement: '1' };
  const { getByTestId } = render(<MovementListItem movement={income} onPress={() => {}} />);
  expect(getByTestId('amount-text').props.style).toMatchObject({ color: '#2db100' });
});
```

---

## 4. E2E Tests

**Tool**: Maestro (preferred for Expo — no native build required for basic flows)

```bash
npm install --save-dev @maestro-mobile/cli
```

**Priority flows** (implement in this order):

```yaml
# e2e/01_add_movement.yaml
appId: com.yourapp.financialtracker
---
- launchApp
- tapOn: "Add movement"
- tapOn:
    text: "Select the type"
- tapOn: "Income"
- tapOn:
    id: "amount-input"
- inputText: "500000"
- tapOn:
    text: "Select a category"
- tapOn: "Salary"
- tapOn:
    id: "description-input"
- inputText: "Monthly salary"
- tapOn: "Save"
- assertVisible: "Monthly salary"
```

```yaml
# e2e/02_transfer_between_entities.yaml
appId: com.yourapp.financialtracker
---
- launchApp
- tapOn: "Transaction"
- assertVisible: "Balance Breakdown"
- tapOn: "Do you want to transfer money?"
# ... select from/to entities, enter amount, save
- assertVisible: "Save transaction"
```

```yaml
# e2e/03_filter_movements.yaml
appId: com.yourapp.financialtracker
---
- launchApp
- tapOn: "week"
- assertNotVisible: "No movements found"  # if week has movements
```

---

## Coverage Targets

| Layer | Target | Rationale |
|---|---|---|
| Domain functions | 90%+ | Pure functions, trivial to test, critical financial logic |
| Repository layer | 80%+ | Storage correctness is fundamental |
| Components | 60%+ | Focus on forms, lists, and alert states |
| E2E | Top 5 user flows | Add movement, transfer, add budget, add goal, view analytics |

**Enforce coverage in CI**:
```bash
npx jest --coverage --coverageThreshold='{"global":{"lines":70,"functions":70}}'
```
