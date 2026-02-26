# Offline-First & Caching Strategy

---

## Current Offline State

The app is fully offline by default (no network dependency), which is good. However, it handles the offline state poorly:

- **Data loss on device replacement is permanent and silent.** If a user loses their phone, all financial history is gone with no recovery path.
- **No sync capability.** Data cannot be shared across devices.
- **No backup mechanism.** There is no export or cloud backup feature.

---

## Immediate: Manual Backup (No Backend Required)

Before any backend work, implement a JSON export feature. This is a 1-day implementation with high user value.

```ts
// features/settings/domain/exportData.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface ExportPayload {
  schemaVersion: number;
  exportedAt: string;          // ISO 8601
  movements: IMovement[];
  entities: IEntity[];
  goals?: IGoal[];
  budgets?: IBudget[];
  recurringDebts?: IRecurringDebt[];
  longTermDebts?: ILongTermDebt[];
}

export async function exportDataToJson(data: ExportPayload): Promise<void> {
  const filename = `financial_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Save your financial data backup',
    });
  }
}

export async function importDataFromJson(fileUri: string): Promise<ExportPayload> {
  const content = await FileSystem.readAsStringAsync(fileUri);
  const data = JSON.parse(content) as ExportPayload;

  // Validate schema version before importing
  if (!data.schemaVersion || !data.movements) {
    throw new Error('Invalid backup file format');
  }

  return data;
}
```

**UX**: A "Backup & Restore" section in Settings with:
- "Export data" → triggers the share sheet with the JSON file.
- "Import data" → opens the document picker, validates the file, shows a preview ("This will import X movements from [date]"), and confirms before overwriting.

---

## Offline-First Architecture Principles

When a backend is eventually added, follow these principles to maintain a reliable offline experience:

### 1. Local-First Writes

All mutations (add movement, mark debt payment, add goal contribution) write to the **local SQLite database first**. The operation is considered successful as soon as the local write completes. Server sync is a background process.

```
User action → Local SQLite write → UI update → Background sync queue → Server
                     ↑                                    ↓
               Immediate success                   Sync on next opportunity
```

### 2. Sync Queue

Pending operations are stored in a `sync_queue` table in SQLite:

```sql
CREATE TABLE sync_queue (
  id            TEXT PRIMARY KEY,
  operation     TEXT NOT NULL,      -- 'create' | 'update' | 'delete'
  entity_type   TEXT NOT NULL,      -- 'movement' | 'goal' | 'budget' | etc.
  entity_id     TEXT NOT NULL,
  payload       TEXT,               -- JSON of the full entity (for create/update)
  created_at    TEXT NOT NULL,
  retry_count   INTEGER DEFAULT 0,
  last_error    TEXT
);
```

A background sync worker (via `expo-task-manager` or app-foreground polling) processes the queue when network is available.

### 3. Optimistic Updates with Rollback

When a server sync fails, the local data remains as-is (the source of truth). Show a non-blocking error indicator ("Some changes haven't synced yet"). Do not rollback local changes automatically — the user's intent was captured. Retry in the background.

### 4. Conflict Resolution

For single-user apps, **last-write-wins** using `updatedAt` timestamps as the tiebreaker is sufficient:
- If a conflict is detected (same entity modified on two devices), keep the version with the newer `updatedAt`.
- Log the conflict for audit purposes.

CRDT-based sync is only necessary for real-time multi-user collaborative editing — overkill for a personal finance app.

---

## Caching Strategy

### Caching Tiers

| Tier | Storage | TTL | Invalidation |
|---|---|---|---|
| **In-memory (Zustand)** | RAM | App session | On any mutation |
| **Computed result cache** | Zustand state | Until source data changes | Via `useMemo` / `useEffect` dependency |
| **SQLite** | Device filesystem | Persistent | Explicit delete/update queries |
| **HTTP response cache** | (future, if backend added) | Per-endpoint TTL | Server cache-control headers |

### What to Cache Where

**Hot data in Zustand (in-memory)**:
- Current period movements (today/week/month)
- Active entity balances
- Active budget statuses (current period)
- Active goals with progress
- Notifications/pending alerts

These are small datasets that change frequently. Keeping them in Zustand means zero-latency reads for UI rendering.

**Computed result cache (Zustand + `useMemo`)**:
- Analytics report for the current selected period
- Financial health snapshot
- Cash flow forecast
- Budget history charts

These are expensive to compute but change infrequently. Cache with a `computedAt` timestamp:

```ts
// features/analytics/hooks/useAnalyticsReport.ts
import { useMemo } from 'react';
import { useMovementsStore } from '@/store/movementsStore';
import { buildAnalyticsReport } from '../domain/analyticsAggregator';

export function useAnalyticsReport(startDate: Date, endDate: Date, granularity: 'daily' | 'weekly' | 'monthly') {
  const movements = useMovementsStore((state) => state.movements);

  const report = useMemo(
    () => buildAnalyticsReport({ movements, startDate, endDate, granularity, categoryLabels: {}, entityNames: {} }),
    // Recomputes when movements OR the selected period changes
    [movements, startDate.getTime(), endDate.getTime(), granularity],
  );

  return report;
}
```

For very large movement datasets (1,000+), move the computation to a `useEffect` with a 300ms debounce:

```ts
// Debounced version for large datasets
export function useAnalyticsReportDebounced(startDate: Date, endDate: Date, granularity: string) {
  const movements = useMovementsStore((state) => state.movements);
  const [report, setReport] = useState<IAnalyticsReport | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setReport(buildAnalyticsReport({ movements, startDate, endDate, granularity, categoryLabels: {}, entityNames: {} }));
    }, 300);
    return () => clearTimeout(timer);
  }, [movements, startDate, endDate, granularity]);

  return report;
}
```

**SQLite (persistent, long-lived)**:
- Amortization tables (write-once, read-many — never recompute)
- Historical analytics snapshots (for the "this month vs. last month" comparison)
- Goal contribution history
- Budget alert history

### Cache Invalidation Rules

| Data that changes | What to invalidate |
|---|---|
| Any movement mutation | Balance display, budget statuses (current period), health snapshot, analytics report for affected period |
| Any debt payment marked | Affected amortization entry, remaining principal, health snapshot |
| Any goal contribution added/deleted | Goal progress (`currentAmount`), health snapshot |
| Any budget mutated | Budget status for current period |
| Period filter changed | Filtered movements list (Zustand selector), analytics report |

**The general rule**: Derived values are always recomputed from source data. Never invalidate + re-fetch from storage for simple mutations — update the in-memory store and let the derived computation rerun via `useMemo`.

---

## Data Loss Prevention Checklist

- [ ] Implement JSON export in `features/settings/`
- [ ] Implement JSON import with validation and preview in `features/settings/`
- [ ] Add a periodic backup reminder (every 30 days: "You haven't backed up your data in 30 days. Back up now?")
- [ ] Document the `sync_queue` SQLite table for future backend integration
- [ ] Add an `isHydrated` flag to each Zustand store to prevent UI rendering before storage has loaded
