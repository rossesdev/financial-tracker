# Architecture Evaluation

Full assessment of the current codebase across 10 dimensions.

---

## 1. Architecture Quality

**Strengths**
- Expo Router enforces consistent, well-understood file-based routing conventions.
- Context separation between `MovementsContext` and `EntitiesContext` shows intent to isolate domain concerns.
- TypeScript is present throughout, providing at least a surface-level contract between modules.

**Weaknesses**
- Root `app/_layout.tsx` nests `ThemeProvider`, `EntitiesProvider`, and `MovementsProvider` with no dependency inversion. Any new cross-cutting concern (auth, notifications, analytics) gets bolted onto this same file, turning it into a God Provider.
- No layered architecture. UI components reach directly into storage abstractions. `storage/storage.ts` uses raw `any[]` — the storage layer has no schema contract.
- `utils/getDataByType.tsx` fetches entity data from mock JSON files, not from `EntitiesContext`. This creates **two sources of truth** for the same domain concept. If a user ever modifies entity data, this utility would silently return stale data.
- The `mocks/` folder is used as application configuration, not as test fixtures. This is an architectural category error — mock data in production code paths will confuse every future contributor.
- `recalcTotalsFromMovements` is a domain operation (financial calculation) embedded inside a React Context provider. Domain logic must not live in presentation-layer infrastructure.
- The `try/catch` in `recalcTotalsFromMovements` swallows all errors silently. Functionally identical to having no error handling.

**Refactoring Suggestions**
- Introduce a `src/domain/` folder containing pure functions for financial calculations. Extract `recalcTotalsFromMovements`, balance computation, and all `parseInt`/formatting logic into this layer.
- Replace the mock JSON files with a `config/` folder: `config/categories.ts`, `config/defaultEntities.ts`, `config/movementTypes.ts`. Mark them as seeding defaults, not mock data.
- Create a typed `IStorageRepository` interface (`storage/repositories/interfaces/`) that contexts depend on — not a raw AsyncStorage wrapper. Enables testing and future backend swap.
- Adopt feature-first folder structure (detailed in `docs/02_FRONTEND_BACKEND.md`).

---

## 2. Code Structure & Modularity

**Strengths**
- `components/Movement/` and `components/ui/` show domain-aware and layer-aware modularity.
- UI primitives (`Button`, `Input`, `Modal`, `Select`, `Chip`) are correctly extracted into `components/ui/`.

**Weaknesses**
- `utils/current.tsx` has a `.tsx` extension but contains zero JSX. It is a pure utility function. File extension discipline is absent.
- `utils/getDataByType.tsx` combines three completely different concerns (label lookup, category data fetching, movement data filtering) — a utility dumping ground.
- `components/FilterAllMovements.tsx` and `components/MovementsFilterButtons.tsx` both handle the same filter domain; the boundary between them is unclear.
- `hooks/useMovementsFilterButtons.tsx` conflates view-layer hook logic with domain computation.
- No barrel exports (`index.ts`) on any folder — import paths are long and fragile to file moves.

**Refactoring Suggestions**
- Rename `utils/current.tsx` → `utils/formatCurrency.ts`.
- Split `utils/getDataByType.tsx` into `utils/getLabelById.ts`, `utils/getCategoryData.ts`, `utils/filterMovements.ts`.
- Add `index.ts` barrel files to every component subfolder.
- Move `hooks/useMovementsFilterButtons.tsx` into `features/movements/hooks/`.

---

## 3. State Management Approach

**Strengths**
- `filteredMovements` is wrapped in `useMemo` in `MovementsContext` — correct optimization for derived state.
- The context split between movements and entities reflects an attempt at domain separation.

**Weaknesses**
- **Dual filter systems**: The home screen maintains local `filteredMovements` state derived from the context's already-filtered state. Filter-on-filter chain is difficult to reason about and will produce incorrect results if either filter mutates.
- **Data loss bug**: The `useEffect` watching `movements` calls `saveMovements` on every update, **including the initial hydration load**. This can write an empty array to storage before data is loaded, wiping persisted data in a race condition.
- **No `isHydrated` flag**: Nothing prevents the save effect from firing before the load effect completes. This is a data loss bug waiting to trigger on slow device I/O.
- `fetchData` is not wrapped in `useCallback` — it is recreated on every render. If used as an effect dependency, it will cause an infinite loop.
- **`isTransfering` no-op effect** in `app/(tabs)/transaction.tsx`: `useEffect(() => { if (!isTransfering) setIsTransfering(false); }, [isTransfering])` does **absolutely nothing** — unfinished logic never cleaned up.

**Refactoring Suggestions**
- Add an `isHydrated: boolean` flag to `MovementsContext`. Guard the save `useEffect` with `if (!isHydrated) return;`.
- Eliminate the local filter state on the home screen. All filtering flows through a single `FilterContext` or `useMovementsFilter` hook.
- Wrap `fetchData` in `useCallback` with an empty dependency array.
- **Migrate to Zustand** with `persist` middleware. Eliminates the Provider pyramid, handles `isHydrated` correctly, is simpler to test in isolation. The current Context approach will not scale to 7 additional features without becoming a Provider pyramid.

---

## 4. Scalability

**Strengths**
- The app is small enough that current architecture doesn't cause visible problems yet — there's runway to refactor before pain becomes critical.

**Weaknesses**
- **O(n) on every mutation**: Every movement add/delete triggers `recalcTotalsFromMovements`, which iterates all movements. At 10,000 movements this produces visible UI lag on mid-range Android.
- **O(n) ID generation**: The `reduce` in `addMovement` scans all movements on every add. Should be a tracked `maxId` counter or a UUID.
- **AsyncStorage is not a queryable database**: Filtering 10,000 movements requires loading the entire array into memory, deserializing it, and filtering in JavaScript. No indexing, no partial loading, no pagination at the storage layer.
- **All movements in memory**: The entire movement history is held in React state. With amortization schedules, forecasting, and goals, this payload will grow significantly.
- **Hardcoded entity and category lists**: Cannot scale to user-defined entries without an architectural change to the storage model.

**Refactoring Suggestions**
- Replace AsyncStorage with **`expo-sqlite`** — the single most impactful change for scalability. Enables indexed queries, pagination, and partial loading without holding the full dataset in memory.
- Replace `reduce`-based ID generation with `nanoid` (3KB, no native deps).
- Add pagination to the movement list: 50 items at a time with a "load more" trigger.
- Replace full entity total recalculation with incremental delta updates on add/delete.

---

## 5. Maintainability

**Strengths**
- TypeScript interfaces in `types/` provide documented data contracts.
- TODO comments acknowledge outstanding work (`// TODO: Refactor this screen`, `// TODO: Add security measures`).

**Weaknesses**
- **Silent error swallowing** in `recalcTotalsFromMovements` — when this fails, the app displays wrong data with no indication to developer or user.
- **`as any` casts**: `entity` field is typed as `number` in `transaction.tsx` but cast to `any` to match `IMovement.entity: string`. This is a type lie that silently corrupts data.
- **Zero test coverage**: Every refactoring is a blind operation.
- **Commented-out code in production**: `FinanceLineChart` is imported but commented out in `app/(tabs)/index.tsx`. Dead imports and commented code should be removed.
- `app/allMovements.tsx` appears to be an unfinished screen with unclear integration — shipping incomplete screens without a feature flag creates confusion.

**Refactoring Suggestions**
- Replace all silent catch blocks with explicit error logging (`console.error` in dev, Sentry in prod).
- Fix the `entity` type mismatch — enforce `string` throughout with a conversion at the transaction boundary.
- Remove commented-out `FinanceLineChart` import. Restore behind a feature flag in `constants/AppConfig.ts` or delete it.
- Move `mocks/` to `config/` and rename files to reflect their role as application defaults.

---

## 6. Performance Optimization

**Strengths**
- `filteredMovements` is wrapped in `useMemo` in `MovementsContext` — the one correct memoization in the codebase.

**Weaknesses**
- **`BalanceDisplay` recalculates on every render** with no `useMemo`. If the parent re-renders for any reason (unrelated state change, theme change, keyboard show), balance is recalculated from the full movements array.
- **`recalcTotalsFromMovements` is O(n) and unmemoized** — called via `useEffect` on every movement change, even for description updates.
- **No `React.memo` on list items** — `MovementListItem` re-renders for every item when any parent state changes.
- If movement lists render via `ScrollView`, all items are mounted simultaneously. `FlatList` is mandatory for lists over 20 items.
- `FinanceLineChart` is imported even when commented out — tree-shaking may not eliminate this at Metro bundler level without explicit removal.

**Refactoring Suggestions**
- Wrap `BalanceDisplay`'s calculation: `const totalBalance = useMemo(() => computeBalance(movements), [movements]);`
- Wrap `MovementListItem` in `React.memo` with a custom comparator on `movement.id` and `movement.amount`.
- Verify movement lists use `FlatList` with `keyExtractor`, `getItemLayout` (if fixed height), and `initialNumToRender={10}`.
- Remove the commented-out chart import entirely.

---

## 7. Reusability of Components

**Strengths**
- The `components/ui/` component library (`Button`, `Input`, `Modal`, `Select`, `Chip`) is well-scoped for reuse.
- `ThemedText` and `ThemedView` correctly encapsulate theme-aware styling.
- `Divider` and `Collapsible` are appropriately generic.

**Weaknesses**
- `MovementDetailsContent.tsx` is tightly coupled to the movement modal flow. If movement details need to appear in a different context (e.g., a debt detail screen), this component will resist reuse.
- `FilterAllMovements.tsx` likely has hardcoded movement-specific filter fields, limiting reuse for filtering debts or goals.
- `components/ui/Date/DatePicker.tsx` and `Date/RangePicker.tsx` are thin wrappers around `react-native-paper-dates`. If they contain minimal app-specific logic, they add a layer without value.
- No Storybook or component catalogue — the true reusability surface is unknown without running the app.

**Refactoring Suggestions**
- Make `MovementDetailsContent` accept a generic `DetailItem[]` prop instead of `IMovement` directly, allowing it to display debt details, goal summaries, etc.
- Generalize `FilterAllMovements` to accept a `FilterConfig` prop describing which filter dimensions are active, making it usable across entity types.

---

## 8. UX/UI Logic & Clarity

**Strengths**
- Period filter buttons (today/week/month) provide intuitive movement scoping.
- The entity card grid in `transaction.tsx` gives a clear visual of account balances.

**Weaknesses**
- **No validation feedback on movement form**: Users can submit an empty form, a negative amount, or a future date with no warning. The `saveMovement` function has a `// TODO: Add security measures` comment.
- **No loading states**: No skeleton screen or spinner while AsyncStorage loads. App appears blank on slow devices.
- **No empty states**: No UI feedback when the movement list is empty for a given period.
- **No confirmation on destructive actions**: No undo or confirmation dialog.
- **Maximum 8 movements** on home screen with no clear "see all" integration to `app/allMovements.tsx`.
- The `isTransfering` no-op effect indicates the transfer confirmation flow may be incomplete.

**Refactoring Suggestions**
- Implement form validation using `react-hook-form` + `zod` (see `docs/02_FRONTEND_BACKEND.md`).
- Add a global `LoadingScreen` component that renders while `isHydrated === false`.
- Add empty state illustrations to the movement list.
- Implement a `ConfirmationModal` component in `components/shared/` for all destructive actions.

---

## 9. Data Modeling Strategy

**Strengths**
- `IMovement`, `IEntity`, and `FilterState` are defined in typed interfaces, providing a basic schema contract.
- Separation of `types/` from `mocks/` shows intent to separate shape from data.

**Weaknesses**
- **`amount` as a formatted string is the single most dangerous data modeling decision in the codebase.** Storing `"1.500.000"` means: sorting requires parsing, arithmetic requires parsing, parsing is locale-dependent, formatting bugs permanently corrupt stored values, and decimal support is impossible without a full redesign.
- **`id: number` as auto-increment** is unsafe for concurrent writes and future sync scenarios.
- **`IMovement.entity` as a string ID ref** with no foreign key enforcement — orphaned movements referencing non-existent entities are silently possible.
- **`IEntity.total_amount: string`** is a derived value stored alongside source data. It will diverge from ground truth whenever recalculation is skipped or fails silently.
- **No `createdAt` / `updatedAt` timestamps** on `IMovement` — essential for audit trails, sync, and conflict resolution.
- **No schema version field** anywhere in persisted data — no migration path when `IMovement` changes.
- **`date: Date` deserialization bug**: `JSON.parse` does not convert ISO strings back to `Date` objects. `date-fns` operations on loaded movements will fail silently unless there is explicit date revival in storage (not present in `storage/storage.ts`).

**Refactoring Suggestions**
- Store `amount` as `number` (integer cents). Create `formatAmount(amount: number, locale: string): string` for display and `parseAmount(input: string, locale: string): number` for input. All storage and arithmetic operates on the integer.
- Add `createdAt: string` and `updatedAt: string` (ISO 8601) to `IMovement`.
- Add `schemaVersion: number` to the root persisted object.
- Remove `total_amount` from `IEntity` storage — derive it at read time from movements.
- Implement a date reviver in `storage/storage.ts`:

```ts
function reviveMovement(raw: Record<string, unknown>): IMovement {
  return {
    ...raw,
    date: new Date(raw.date as string),
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
  } as IMovement;
}
```

---

## 10. Security Considerations

**Strengths**
- No backend means no server-side attack surface.
- No authentication means no credential handling complexity currently.

**Weaknesses**
- **AsyncStorage is plaintext**: All financial data is stored unencrypted on the device. On a rooted/jailbroken device, any app with filesystem access can read it. The `// TODO: Add security measures` comment in `app/(tabs)/movement.tsx` acknowledges this without addressing it.
- **No input sanitization**: Amounts and descriptions are stored as-is; malformed input can corrupt the JSON payload and break deserialization.
- **No biometric lock**: Anyone who picks up an unlocked phone has full access to all financial data.
- **No data export controls**: If export is added in the future, there is no access control layer to bolt onto.
- **`as any` type casting** in `app/(tabs)/transaction.tsx` is a type safety hole that can allow malformed data to be written to storage.

**Refactoring Suggestions**
- Replace AsyncStorage with **`react-native-encrypted-storage`** for sensitive values, or **`expo-sqlite`** + SQLCipher for larger datasets (see `docs/robustness/SECURITY_ENCRYPTION.md`).
- Add **biometric authentication** via `expo-local-authentication` as an app-open gate.
- Sanitize and validate all user inputs at the form layer before they reach context or storage.
- Remove all `as any` casts and fix the underlying type mismatches.
