# Frontend vs Backend Responsibilities

---

## Frontend (React Native / Expo)

### What Stays On-Device

- All UI state and interaction logic.
- All derived/computed values (balance, health score, budget status) — computed from stored source data.
- The local movement, entity, goal, and debt stores (SQLite via `expo-sqlite`).
- Amortization table computation — pure math, no network needed.
- Forecast generation — deterministic from local data.
- Biometric authentication gate.
- Push notification scheduling (via `expo-notifications` local triggers).
- Filter and search logic.

### What Should Be Abstracted Behind Interfaces

Every storage operation must be behind a repository interface. This is non-negotiable for testability and for the eventual backend migration.

```ts
// storage/repositories/interfaces/IMovementRepository.ts
interface IMovementRepository {
  getAll(): Promise<IMovement[]>;
  getById(id: string): Promise<IMovement | null>;
  getByDateRange(start: Date, end: Date): Promise<IMovement[]>;
  getByCategory(categoryId: string): Promise<IMovement[]>;
  save(movement: IMovement): Promise<void>;
  update(movement: IMovement): Promise<void>;
  delete(id: string): Promise<void>;
}

// storage/repositories/interfaces/IGoalRepository.ts
interface IGoalRepository {
  getAll(): Promise<IGoal[]>;
  getById(id: string): Promise<IGoal | null>;
  save(goal: IGoal): Promise<void>;
  update(goal: IGoal): Promise<void>;
  delete(id: string): Promise<void>;
}
```

Concrete implementations swap between AsyncStorage (current), SQLite (next), and HTTP (future backend) without touching the calling code.

---

### Recommended Folder Structure (Feature-First + Clean Architecture)

```
src/
  app/                          # Expo Router screens — thin shells only, no business logic
    (tabs)/
      index.tsx
      movement.tsx
      transaction.tsx
    allMovements.tsx

  features/
    movements/
      components/
        MovementListItem.tsx
        MovementsList.tsx
        MovementDetailsContent.tsx
        MovementsFilterButtons.tsx
      hooks/
        useMovements.ts
        useMovementsFilter.ts
      screens/
        AddMovementScreen.tsx
        AllMovementsScreen.tsx
      domain/                   # Pure TS functions — zero React imports
        movementValidator.ts
        movementCalculations.ts
      types.ts
      index.ts                  # barrel export

    entities/
      components/
        EntityCard.tsx
        EntityBalanceGrid.tsx
      hooks/
        useEntities.ts
      domain/
        entityCalculations.ts
      types.ts

    recurringDebts/
      components/
      hooks/
      domain/
        recurringDebtScheduler.ts
      types.ts

    longTermDebts/
      components/
      hooks/
      domain/
        amortization.ts         # computeFrenchAmortizationTable lives here
      types.ts

    goals/
      components/
      hooks/
      domain/
        goalCalculations.ts
      types.ts

    budgets/
      components/
      hooks/
      domain/
        budgetEvaluator.ts
      types.ts

    analytics/
      components/
        charts/
      hooks/
        useAnalyticsReport.ts
      domain/
        analyticsAggregator.ts
      types.ts

    forecast/
      domain/
        forecastEngine.ts
      hooks/
        useForecast.ts
      types.ts

    dashboard/
      components/
        HealthScoreCard.tsx
        RatioCard.tsx
      hooks/
        useFinancialHealth.ts
      domain/
        healthCalculator.ts
      types.ts

  shared/
    components/
      ui/                       # Button, Input, Modal, Select, Chip, Chip
      ThemedText.tsx
      ThemedView.tsx
      Divider.tsx
      Collapsible.tsx
      LoadingScreen.tsx
      EmptyState.tsx
      ConfirmationModal.tsx
    hooks/
      useColorScheme.ts
      useThemeColor.ts
    utils/
      formatCurrency.ts         # replaces utils/current.tsx
      dateUtils.ts
      idGenerator.ts            # nanoid wrapper
    types/
      common.ts                 # shared types (FilterState, etc.)
      errors.ts                 # AppError, AppErrorCode

  domain/                       # Cross-feature pure domain functions
    financialCalculations.ts
    currencyParser.ts

  storage/
    repositories/
      interfaces/
        IMovementRepository.ts
        IEntityRepository.ts
        IGoalRepository.ts
        IDebtRepository.ts
        IBudgetRepository.ts
      sqlite/
        SQLiteMovementRepository.ts
        SQLiteEntityRepository.ts
      asyncStorage/             # legacy — keep during migration period
        AsyncStorageMovementRepository.ts
    migrations/
      v1_initial.ts
      v2_add_goals.ts
      migrationRunner.ts
    StorageProvider.tsx         # dependency injection for repositories

  config/                       # replaces mocks/
    categories.ts
    defaultEntities.ts
    movementTypes.ts

  store/                        # Zustand stores
    movementsStore.ts
    entitiesStore.ts
    goalsStore.ts
    debtsStore.ts
    budgetsStore.ts
    uiStore.ts                  # loading states, modal visibility, error messages

  constants/
    Colors.ts
    AppConfig.ts                # schemaVersion, feature flags
```

---

### Recommended Architectural Pattern: Feature-Sliced Design + Clean Architecture Boundaries

**Justification**: The current type-first structure (`components/`, `context/`, `utils/`, `types/`) creates invisible coupling — a change to the movement data model requires touching files across 5 directories. Feature-first co-location means a change to movements touches files in one directory (`features/movements/`). Clean architecture boundaries (domain layer with no framework dependencies, repository interfaces for storage) mean that domain logic can be unit-tested without React, without Expo, and without AsyncStorage.

**The cardinal rule of the domain layer**: Files in `features/*/domain/` must contain **zero React imports**. They are pure TypeScript functions that take data and return data. They are the most testable, most portable code in the codebase.

---

### Form Validation Strategy

Use **`react-hook-form`** + **`zod`**:

```ts
// features/movements/domain/movementValidator.ts
import { z } from 'zod';

export const MovementSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .int('Amount must be a whole number')
    .positive('Amount must be greater than zero'),
  typeOfMovement: z.enum(['1', '2'], { errorMap: () => ({ message: 'Select a type' }) }),
  category: z.string().min(1, 'Category is required'),
  date: z.date({ required_error: 'Date is required' }),
  entity: z.string().optional(),
});

export type MovementFormValues = z.infer<typeof MovementSchema>;
```

In the screen component:

```ts
const { control, handleSubmit, formState: { errors } } = useForm<MovementFormValues>({
  resolver: zodResolver(MovementSchema),
  defaultValues: { date: new Date() },
});
```

---

### Error Handling Strategy

Define a typed error hierarchy:

```ts
// shared/types/errors.ts
type AppErrorCode =
  | 'STORAGE_READ_FAILED'
  | 'STORAGE_WRITE_FAILED'
  | 'VALIDATION_FAILED'
  | 'CALCULATION_ERROR'
  | 'DATA_MIGRATION_FAILED';

class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

Rules:
- Storage errors: caught at the repository layer, converted to `AppError`, surfaced to `store/uiStore.ts` where a `errorMessage` state is set.
- Calculation errors: caught at the domain layer, returned as `Result<T, AppError>` pattern (or use `neverthrow` library).
- UI errors: displayed via a global `ErrorToast` component subscribed to `uiStore.errorMessage`.
- **Never swallow errors silently.**

---

### State Management Migration: Context → Zustand

```ts
// store/movementsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';

interface MovementsState {
  movements: IMovement[];
  isHydrated: boolean;
  addMovement: (movement: Omit<IMovement, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteMovement: (id: string) => void;
  updateMovement: (movement: IMovement) => void;
}

export const useMovementsStore = create<MovementsState>()(
  persist(
    (set) => ({
      movements: [],
      isHydrated: false,
      addMovement: (movement) => {
        const newMovement: IMovement = {
          ...movement,
          id: nanoid(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ movements: [...state.movements, newMovement] }));
      },
      deleteMovement: (id) =>
        set((state) => ({ movements: state.movements.filter((m) => m.id !== id) })),
      updateMovement: (movement) =>
        set((state) => ({
          movements: state.movements.map((m) => (m.id === movement.id ? movement : m)),
        })),
    }),
    {
      name: 'movements-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    },
  ),
);
```

Zustand eliminates the Provider pyramid. The `persist` middleware handles save-on-change correctly and does **not** fire on initial hydration — fixing the current data loss bug.

---

## Backend: When and What

### Should This Remain Client-Only?

**Currently: Yes.** For a single-user personal finance tracker with no sharing, no cross-device sync, and no server-side alerts, a backend adds infrastructure complexity without proportional value.

**The conditions under which a backend becomes necessary:**
1. Multi-device sync (user wants data on phone + tablet + web)
2. Data backup/recovery (user loses phone — currently all data is permanently lost)
3. Shared finances (partner/family access)
4. Server-side notifications (budget alerts via push when app is closed)
5. Open banking API integration (automatic transaction import from Colombian banks)
6. Data export to tax authorities

**Recommendation**: Plan the architecture for backend readiness (repository interfaces, typed API contracts) without building the backend now. The repository interface pattern means adding a backend is implementing a new `HttpMovementRepository` that satisfies `IMovementRepository` — the rest of the app does not change.

---

### If Backend Is Added

**Architecture**: REST API (not GraphQL). The data model is not highly relational or graph-like, and GraphQL's complexity overhead is not justified for a personal finance app. REST with clear resource-based endpoints is simpler to build, cache, and debug.

**Stack**: Node.js + Fastify + PostgreSQL + Drizzle ORM. Fastify for performance, PostgreSQL for ACID transactions and proper `INTEGER` currency types, Drizzle for type-safe queries without the complexity of Prisma.

**API endpoints**:
```
POST   /auth/login
GET    /movements?startDate=&endDate=&category=&entity=
POST   /movements
PUT    /movements/:id
DELETE /movements/:id
GET    /entities
GET    /budgets
GET    /budgets/:id/status
GET    /goals
POST   /goals/:id/contributions
GET    /debts/long-term
GET    /forecast?months=3
GET    /dashboard/health
```

**Database schema (key table)**:
```sql
CREATE TABLE movements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  description VARCHAR(200) NOT NULL,
  amount      INTEGER NOT NULL,          -- cents, NEVER DECIMAL for currency
  type        SMALLINT NOT NULL,         -- 1=income, 2=expense
  category_id VARCHAR(50) NOT NULL,
  entity_id   VARCHAR(50),
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movements_user_date ON movements(user_id, date);
CREATE INDEX idx_movements_user_category ON movements(user_id, category_id);
```

**Auth strategy**: JWT with short-lived access tokens (15 minutes) + long-lived refresh tokens (30 days), stored in `expo-secure-store`. Biometric auth on device unlocks the refresh token. No username/password — use magic link or OAuth (Google) to avoid storing passwords.

---

### Where Financial Calculations Live

| Calculation | Location | Reason |
|---|---|---|
| Amortization table | Client | Pure math, no network needed |
| Balance display | Client | Derived from local movements |
| Filter / search | Client | On local data |
| Historical analytics over large datasets | Backend (when it exists) | Too large to hold in memory |
| Cash flow forecasting with bank data | Backend | Needs server-side data |
| Scheduled recurring movement generation | Backend | Background job, no app open needed |

**Rule**: If the calculation requires only data already on the device, do it on the device. If it requires data that lives on the server or needs to run on a schedule without the app being open, do it on the server.

---

### Security Best Practices

- Store JWT refresh tokens in `expo-secure-store`, **never** in AsyncStorage.
- Never log financial amounts to console in production.
- Validate all amounts server-side as integers within safe bounds (`amount > 0 && amount < 999_999_999_99`).
- Use HTTPS for all API communication (Expo enforces this in production by default).
- Rate-limit all endpoints (`fastify-rate-limit`).
- Never store the full movement history in a single AsyncStorage key — single point of failure for data corruption.
