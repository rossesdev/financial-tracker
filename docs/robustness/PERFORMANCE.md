# Performance Profiling & Optimization

---

## Tools

### 1. React Native DevTools (Built into Expo)

Accessible via `npx expo start` → press `j` to open the React DevTools in browser.

Use the **Profiler** tab to:
- Record a profile of a user interaction (e.g., adding a movement, switching the period filter).
- Identify which components re-render unnecessarily.
- Measure render duration per component.

**Focus on**:
- `MovementListItem` — should only re-render when its specific movement changes.
- `BalanceDisplay` — should only re-render when the total balance changes.
- Anything inside a `FlatList` — every unnecessary re-render multiplies by list length.

### 2. Flashlight (BAM.tech)

Measures React Native app performance on **real Android devices** — not simulators. Produces a performance score and a flame graph showing CPU usage.

```bash
# Install
npm install -g @perf-tools/flashlight

# Measure a specific user flow
flashlight measure \
  --app com.yourapp.financialtracker \
  --test ./e2e/01_add_movement.yaml \
  --output ./reports/flashlight_add_movement.json

# View the report
flashlight report ./reports/flashlight_add_movement.json
```

Run measurements on a **mid-range Android device** — not a flagship. Target devices: Xiaomi Redmi Note series, Samsung Galaxy A series. These represent the majority of Colombian Android users.

### 3. `why-did-you-render`

Detects unnecessary re-renders in development:

```bash
npm install --save-dev @welldone-software/why-did-you-render
```

```ts
// src/wdyr.ts (imported first in app entry)
import React from 'react';

if (__DEV__) {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    logOnDifferentValues: true,
  });
}
```

```ts
// In a component you want to track:
MovementListItem.whyDidYouRender = true;
```

### 4. Hermes Profiler (CPU Profiling)

The Hermes JS engine (already the default in Expo SDK 49+) supports CPU profiling via Chrome DevTools.

1. Open Chrome → `chrome://inspect`
2. Connect your device and select the JS thread
3. Record a CPU profile during the target interaction
4. Identify hot JavaScript functions in the flame graph

---

## Key Performance Metrics

Target on **mid-range Android** (Xiaomi Redmi, Samsung Galaxy A series):

| Metric | Target | Measurement Method |
|---|---|---|
| Time to Interactive (TTI) | < 2 seconds | Flashlight — from app launch to home screen interactive |
| List scroll frame rate | 60 fps sustained | React DevTools Profiler during scroll |
| Movement add latency | < 100ms (Save tap → confirmation) | Flashlight test |
| Cold start time | < 3 seconds | Flashlight |
| Analytics report computation | < 200ms for 1,000 movements | Jest `performance.now()` in unit test |
| AsyncStorage read (1,000 movements) | Measure first — expected: 200–500ms | Add timing log in `fetchData` temporarily |

---

## Immediate Profiling Targets

These are the highest-risk items identified in the architecture evaluation:

### Target 1: `recalcTotalsFromMovements` Execution Time

This function runs on every movement change and is O(n). Measure it:

```ts
// Temporary timing wrapper in context/EntitiesContext.tsx
const start = performance.now();
recalcTotalsFromMovements(movements);
console.log(`recalcTotals: ${(performance.now() - start).toFixed(2)}ms for ${movements.length} movements`);
```

Run with 100, 500, 1,000, and 5,000 synthetic movements. If > 16ms at 1,000 movements, replace with incremental balance update.

### Target 2: `BalanceDisplay` Render Frequency

Add a render counter to `BalanceDisplay`:

```ts
const renderCount = useRef(0);
renderCount.current++;
if (__DEV__) console.log(`BalanceDisplay render #${renderCount.current}`);
```

Navigate through the app normally for 30 seconds. If render count > 20, apply `useMemo`.

### Target 3: Home Screen Re-renders on Period Filter Switch

Use React DevTools Profiler:
1. Start profiling.
2. Tap the "week" filter button.
3. Stop profiling.
4. Count how many components re-rendered and why.

Expected: only `MovementsFilterButtons` (to update active state) and `MovementsList` (new data) should re-render. If `BalanceDisplay` or other unrelated components re-render, there is a state leakage.

### Target 4: AsyncStorage Read Time for Large Payloads

```ts
// Temporary timing in storage/storage.ts
const start = performance.now();
const data = await AsyncStorage.getItem(MOVEMENTS_KEY);
console.log(`AsyncStorage read: ${(performance.now() - start).toFixed(2)}ms`);
```

Populate 1,000 movements with the reset script, then cold-start the app. If read time > 200ms, this is the primary justification for the SQLite migration.

---

## Known Performance Bugs to Fix

### Bug 1: Missing `useMemo` on `BalanceDisplay`

**Current** (`components/BalanceDisplay.tsx`):
```ts
// Recalculates on every render — no memoization
const calculateTotalBalance = () => {
  let total = 0;
  movements.forEach((movement) => { ... });
  return total;
};
```

**Fix**:
```ts
const totalBalance = useMemo(() => {
  return movements.reduce((total, movement) => {
    const amount = movement.amount; // integer cents after Sprint 2
    return movement.typeOfMovement === '1' ? total + amount : total - amount;
  }, 0);
}, [movements]);
```

### Bug 2: No `React.memo` on `MovementListItem`

**Current**: `MovementListItem` re-renders for every item whenever the parent list re-renders (e.g., when a different movement is selected in a modal).

**Fix**:
```ts
// components/Movement/MovementListItem.tsx
export const MovementListItem = React.memo(
  ({ movement, onPress }: { movement: IMovement; onPress: (m: IMovement) => void }) => {
    // ... component body
  },
  (prevProps, nextProps) =>
    prevProps.movement.id === nextProps.movement.id &&
    prevProps.movement.amount === nextProps.movement.amount &&
    prevProps.movement.updatedAt === nextProps.movement.updatedAt,
);
```

### Bug 3: `ScrollView` vs `FlatList` for Movement Lists

**Verify**: Check `components/Movement/MovementsList.tsx`. If it uses `ScrollView`, all movements are mounted simultaneously.

**Fix**: Replace with `FlatList`:
```ts
<FlatList
  data={movements}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <MovementListItem movement={item} onPress={onMovementPress} />
  )}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  getItemLayout={(_data, index) => ({
    length: ITEM_HEIGHT,    // define ITEM_HEIGHT as a constant (e.g., 72)
    offset: ITEM_HEIGHT * index,
    index,
  })}
  ListEmptyComponent={<EmptyState message="No movements for this period" />}
/>
```

### Bug 4: Commented-Out Import Creating Bundle Overhead

`app/(tabs)/index.tsx` imports `FinanceLineChart` even though it's commented out. Metro bundler may not tree-shake it.

**Fix**: Remove the import entirely:
```ts
// DELETE this line:
// import { FinanceLineChart } from "@/components/charts/FinanceLineChart";
```

---

## Performance Budget for New Features

When implementing Features 01–07, apply these rules:

| Rule | Detail |
|---|---|
| No O(n²) in the render path | Any nested loop over movements must be moved to a `useMemo` or `useEffect`. |
| Chart components receive pre-aggregated data only | Never pass raw `IMovement[]` to a chart component. Always pre-compute `IAnalyticsReport`. |
| Amortization table display uses `FlatList` | A 360-entry mortgage table must use virtualization. |
| Forecast computation is debounced | Cash flow forecast recomputation is debounced by 300ms after the last state change. |
| SQLite queries are indexed | Every `WHERE` clause in a query must have a corresponding `CREATE INDEX`. |
| Budget status uses SQLite query | Do not filter movements in JavaScript for budget computation — use a SQLite query with a `WHERE category_id IN (...)` clause. |
