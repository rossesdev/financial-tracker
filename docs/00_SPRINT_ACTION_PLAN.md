# Prioritized Action Plan

Ordered by risk reduction and enabling value. Each sprint is a prerequisite for the next.

---

## Sprint 1 — Stop the Bleeding (Critical Bugs)

| # | Action | Risk Addressed |
|---|---|---|
| 1 | Add `isHydrated` guard to the save `useEffect` in `MovementsContext` | Data loss on slow device I/O |
| 2 | Fix the `entity` type mismatch in `transaction.tsx` (`number` cast to `any` instead of `string`) | Silent data corruption |
| 3 | Remove the no-op `useEffect` in `transaction.tsx` (`if (!isTransfering) setIsTransfering(false)`) | Dead code / unfinished logic |
| 4 | Replace all silent `catch` blocks with explicit error logging | Invisible failures, ghost bugs |
| 5 | Move `mocks/` → `config/`, rename files to reflect role as application defaults | Contributor confusion, architectural category error |

**Files to touch:** `context/MovementsContext.tsx`, `app/(tabs)/transaction.tsx`, `context/EntitiesContext.tsx`, `storage/storage.ts`, `mocks/` → `config/`

---

## Sprint 2 — Data Model Repair (Enables All Future Features)

| # | Action | Why |
|---|---|---|
| 1 | Change `amount` from formatted string → integer cents throughout the codebase | The single most dangerous data modeling decision; breaks every new financial feature |
| 2 | Write `formatAmount(amount: number, locale: string): string` utility | Single display formatter |
| 3 | Write `parseAmount(input: string, locale: string): number` utility | Single input parser |
| 4 | Write AsyncStorage migration to convert existing `"1.500.000"` strings → integers | Backward compatibility for existing users |
| 5 | Change `id` from `number` (auto-increment reduce) → `string` (nanoid) on `IMovement` | Safe for concurrent writes, future sync |
| 6 | Add `createdAt: string` (ISO 8601) and `updatedAt: string` to `IMovement` | Audit trail, conflict resolution |
| 7 | Add `schemaVersion: number` to the root persisted object | Migration path for every future schema change |
| 8 | Add date revival in `storage.ts` (`JSON.parse` does not restore `Date` objects) | Silent `date-fns` failures on loaded movements |
| 9 | Remove `total_amount` from `IEntity` storage — derive at read time | Denormalized derived value will diverge from ground truth |

**Files to touch:** `types/movements.ts`, `types/entities.ts`, `storage/storage.ts`, `utils/current.tsx` (rename + expand), `context/MovementsContext.tsx`, `context/EntitiesContext.tsx`, `components/BalanceDisplay.tsx`, `app/(tabs)/movement.tsx`, `app/(tabs)/transaction.tsx`

---

## Sprint 3 — Architecture Restructuring (Enables Scale)

| # | Action | Why |
|---|---|---|
| 1 | Migrate from React Context → **Zustand** with `persist` middleware | Eliminates Provider pyramid, fixes `isHydrated` pattern correctly, simpler to test |
| 2 | Introduce repository interfaces (`IMovementRepository`, `IEntityRepository`, etc.) | Enables testing + future backend swap without touching calling code |
| 3 | Adopt feature-first folder structure (see `docs/02_FRONTEND_BACKEND.md`) | Type-first structure scatters movement files across 5 directories |
| 4 | Add **Jest** + `ts-jest` and write unit tests for all domain functions | Every refactoring above is a blind operation without tests |
| 5 | Implement `react-hook-form` + `zod` validation on all forms | Movement form currently accepts empty/invalid submissions silently |
| 6 | Add `LoadingScreen` component rendered while `isHydrated === false` | App appears blank on slow devices |
| 7 | Add `EmptyState` component for movement lists | No feedback when no movements exist for a period |

**Files to touch:** New `store/` directory, new `storage/repositories/` directory, restructure `features/` directory, `app/(tabs)/movement.tsx`, `app/(tabs)/index.tsx`

---

## Sprint 4 — Storage Migration (Prerequisite for Features 2, 4, 7)

| # | Action | Why |
|---|---|---|
| 1 | Migrate from AsyncStorage → **`expo-sqlite`** | Indexed queries, pagination, partial loading — required for long-term debts, budgets, analytics |
| 2 | Implement SQLite repository implementations (`SQLiteMovementRepository`, etc.) | Satisfies repository interfaces from Sprint 3 |
| 3 | Implement migration runner with v1 schema | Every future schema change needs a numbered, transactional migration |
| 4 | Implement data encryption | AsyncStorage is plaintext; `react-native-encrypted-storage` or SQLCipher |
| 5 | Add biometric auth gate via `expo-local-authentication` | Anyone with an unlocked phone has full access to all financial data |

**Files to touch:** New `storage/repositories/sqlite/` directory, new `storage/migrations/` directory, `app/_layout.tsx` (run migrations on start), new `storage/encryptedStorage.ts`

---

## Sprint 5+ — Feature Implementation Order

Implement in this sequence — each builds on the previous:

1. **Recurring Debts** → `docs/features/FEATURE_01_RECURRING_DEBTS.md` — simplest new domain model
2. **Budget Limits with Alerts** → `docs/features/FEATURE_07_BUDGET_LIMITS.md` — depends on reliable movement data
3. **Goal Tracking** → `docs/features/FEATURE_05_GOALS.md` — independent domain
4. **Analytics & Visual Insights** → `docs/features/FEATURE_04_ANALYTICS.md` — depends on reliable movement data + charts
5. **Financial Health Dashboard** → `docs/features/FEATURE_03_HEALTH_DASHBOARD.md` — aggregates all domains; implement last
6. **Long-Term Debts with Amortization** → `docs/features/FEATURE_02_LONG_TERM_DEBTS.md` — most complex financial logic
7. **Cash Flow Forecasting** → `docs/features/FEATURE_06_CASH_FLOW_FORECAST.md` — depends on recurring debts + long-term debts being stable
