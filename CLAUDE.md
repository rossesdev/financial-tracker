# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (clears cache)
npx expo start -c

# Platform-specific
npx expo run:android
npx expo run:ios
npx expo start --web

# Lint
npx expo lint
```

There are no automated tests in this project.

## Architecture

### Provider hierarchy (`app/_layout.tsx`)
```
EntitiesProvider
  └── MovementsProvider
        └── Stack (expo-router)
```
`EntitiesProvider` must wrap `MovementsProvider` because `MovementsContext` calls `recalcTotalsFromMovements` from `EntitiesContext` after every movement change.

### Data flow
- All data is persisted via AsyncStorage (`storage/storage.ts`) — two keys: `movements` and `entities`.
- On startup, `MovementsContext` loads movements and sets `isHydrated = true`; the save effect is gated on `isHydrated` to prevent overwriting storage with an empty array before load completes.
- After every movement state change, `recalcTotalsFromMovements` recalculates all entity `total_amount` values from scratch by summing movements per entity (`typeOfMovement "1"` = income, `"2"` = expense).

### Amount formatting
All monetary amounts are stored and displayed as COP dot-separated strings (e.g. `"1.500.000"`). Use `addPoints()` from `utils/current.tsx` to format any numeric input before storing it. Strip dots with `.replace(/\./g, "")` before doing arithmetic.

### Static config (`config/`)
The three JSON files (`categories.json`, `entities.json`, `typeOfMovements.json`) are the single source of truth for lookup data. They are imported directly — there is no API or database. `config/entities.json` also serves as the default/fallback state for `EntitiesContext` when AsyncStorage is empty.

### Transfers (`app/(tabs)/transaction.tsx`)
A transfer between entities creates **two movements**: an expense (`typeOfMovement: "2"`) from the source entity and an income (`typeOfMovement: "1"`) to the destination entity, both with `category: "8"` (Transaccion).

### Filtering
`MovementsContext` exposes both `movements` (all) and `filteredMovements` (derived via `useMemo`). The home screen does its own client-side period filter (today/week/month) via `useMovementsFilterButtons` on top of `movements`. The `allMovements.tsx` screen consumes `filteredMovements` with the full filter panel.

### Key type conventions
- `IMovement.entity` is `string | undefined` (stringified entity id, e.g. `"1"`)
- `IEntity.id` is `number`
- `typeOfMovement` values are string literals `"1"` (income) / `"2"` (expense)
- `category` values are string literals matching `config/categories.json` `.value` fields
