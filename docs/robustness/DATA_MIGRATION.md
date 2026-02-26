# Data Migration & Versioning Strategy

This is the most overlooked concern in the current architecture and will be the most painful problem once the app has real users. Every schema change without a migration runner risks silently corrupting data or crashing the app on upgrade.

---

## The Problem

When you change `IMovement` (add a field, change a type, remove a field), data persisted by existing users will not match the new type. `JSON.parse` will produce an object that doesn't satisfy the new TypeScript interface, and the app will either:

1. Crash with a runtime error.
2. Silently display wrong data (worse than crashing).

There is currently no schema version field in any persisted data and no migration mechanism.

---

## Phase 1: AsyncStorage Migrations (Before SQLite)

Before migrating to SQLite, all schema changes must go through an AsyncStorage migration runner.

### Schema Version Tracking

```ts
// storage/schemaVersion.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCHEMA_VERSION_KEY = 'schema_version';

export async function getCurrentSchemaVersion(): Promise<number> {
  const raw = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

export async function setSchemaVersion(version: number): Promise<void> {
  await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(version));
}
```

### Migration Runner

```ts
// storage/migrations/asyncStorageMigrationRunner.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentSchemaVersion, setSchemaVersion } from '../schemaVersion';
import logger from '@/shared/utils/logger';

interface AsyncStorageMigration {
  version: number;
  description: string;
  up: () => Promise<void>;
}

const migrations: AsyncStorageMigration[] = [
  {
    version: 1,
    description: 'Convert amount from formatted string to integer cents; add id as string (nanoid); add createdAt/updatedAt',
    up: async () => {
      const raw = await AsyncStorage.getItem('movements');
      if (!raw) {
        await setSchemaVersion(1);
        return;
      }

      const movements = JSON.parse(raw) as any[];
      const migrated = movements.map((m: any, index: number) => ({
        ...m,
        // Convert numeric id to string
        id: m.id !== undefined ? String(m.id) : String(index + 1),
        // Convert formatted amount string to integer cents
        amount: typeof m.amount === 'string'
          ? parseInt(m.amount.replace(/\./g, '').replace(/\s/g, ''), 10) || 0
          : (m.amount ?? 0),
        // Ensure date is stored as ISO string, not Date object or other format
        date: m.date ? new Date(m.date).toISOString() : new Date().toISOString(),
        // Add missing timestamps
        createdAt: m.createdAt ?? m.date ?? new Date().toISOString(),
        updatedAt: m.updatedAt ?? m.date ?? new Date().toISOString(),
      }));

      await AsyncStorage.setItem('movements', JSON.stringify(migrated));
      logger.info('Migration v1: converted amounts and added timestamps', { count: migrated.length });
    },
  },
  {
    version: 2,
    description: 'Convert entity id references from number to string in movements',
    up: async () => {
      const raw = await AsyncStorage.getItem('movements');
      if (!raw) return;

      const movements = JSON.parse(raw) as any[];
      const migrated = movements.map((m: any) => ({
        ...m,
        entity: m.entity !== undefined && m.entity !== null ? String(m.entity) : undefined,
      }));

      await AsyncStorage.setItem('movements', JSON.stringify(migrated));
    },
  },
];

/**
 * Runs all pending AsyncStorage migrations in sequence.
 * Call this once on app start, before any other storage operations.
 */
export async function runAsyncStorageMigrations(): Promise<void> {
  const currentVersion = await getCurrentSchemaVersion();
  const pending = migrations.filter((m) => m.version > currentVersion);

  if (pending.length === 0) return;

  logger.info(`Running ${pending.length} AsyncStorage migration(s)`, { from: currentVersion });

  for (const migration of pending) {
    try {
      logger.info(`Applying migration v${migration.version}: ${migration.description}`);
      await migration.up();
      await setSchemaVersion(migration.version);
      logger.info(`Migration v${migration.version} completed`);
    } catch (error) {
      logger.error(`Migration v${migration.version} FAILED`, error);
      // Do NOT continue to subsequent migrations — stop and surface the error
      throw new Error(`Data migration failed at version ${migration.version}. The app cannot start safely.`);
    }
  }
}
```

### Calling Migrations on App Start

```tsx
// app/_layout.tsx
import { runAsyncStorageMigrations } from '@/storage/migrations/asyncStorageMigrationRunner';

export default function RootLayout() {
  const [migrationsDone, setMigrationsDone] = useState(false);
  const [migrationError, setMigrationError] = useState<Error | null>(null);

  useEffect(() => {
    runAsyncStorageMigrations()
      .then(() => setMigrationsDone(true))
      .catch((err) => setMigrationError(err));
  }, []);

  if (migrationError) {
    return <MigrationErrorScreen error={migrationError} />;
  }

  if (!migrationsDone) {
    return <LoadingScreen message="Updating your data..." />;
  }

  return (
    // ... rest of providers
  );
}
```

---

## Phase 2: SQLite Migrations

After migrating to `expo-sqlite`, all schema changes are SQL `ALTER TABLE` or `CREATE TABLE` statements wrapped in transactions.

### SQLite Migration Runner

```ts
// storage/migrations/sqliteMigrationRunner.ts
import * as SQLite from 'expo-sqlite';
import logger from '@/shared/utils/logger';

interface SQLiteMigration {
  version: number;
  description: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

const migrations: SQLiteMigration[] = [
  {
    version: 1,
    description: 'Initial schema: movements, entities, schema_version',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS movements (
          id            TEXT PRIMARY KEY,
          description   TEXT NOT NULL,
          amount        INTEGER NOT NULL,
          type          TEXT NOT NULL CHECK (type IN ('1', '2')),
          category_id   TEXT NOT NULL,
          entity_id     TEXT,
          date          TEXT NOT NULL,
          created_at    TEXT NOT NULL,
          updated_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS entities (
          id            TEXT PRIMARY KEY,
          name          TEXT NOT NULL,
          image         TEXT NOT NULL,
          created_at    TEXT NOT NULL,
          updated_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER NOT NULL
        );

        INSERT INTO schema_version (version) VALUES (1);

        CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(date);
        CREATE INDEX IF NOT EXISTS idx_movements_category ON movements(category_id);
        CREATE INDEX IF NOT EXISTS idx_movements_entity ON movements(entity_id);
      `);
    },
  },
  {
    version: 2,
    description: 'Add goals and goal_contributions tables',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS goals (
          id            TEXT PRIMARY KEY,
          name          TEXT NOT NULL,
          target_amount INTEGER NOT NULL,
          target_date   TEXT,
          entity_id     TEXT,
          category      TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'active',
          created_at    TEXT NOT NULL,
          updated_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS goal_contributions (
          id            TEXT PRIMARY KEY,
          goal_id       TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
          movement_id   TEXT,
          amount        INTEGER NOT NULL,
          date          TEXT NOT NULL,
          note          TEXT,
          created_at    TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON goal_contributions(goal_id);

        UPDATE schema_version SET version = 2;
      `);
    },
  },
  {
    version: 3,
    description: 'Add budgets tables',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS budgets (
          id            TEXT PRIMARY KEY,
          name          TEXT NOT NULL,
          limit_amount  INTEGER NOT NULL,
          period        TEXT NOT NULL,
          rollover      INTEGER NOT NULL DEFAULT 0,
          rollover_cap  INTEGER,
          is_active     INTEGER NOT NULL DEFAULT 1,
          created_at    TEXT NOT NULL,
          updated_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS budget_categories (
          budget_id     TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
          category_id   TEXT NOT NULL,
          PRIMARY KEY (budget_id, category_id)
        );

        CREATE TABLE IF NOT EXISTS budget_alerts (
          id            TEXT PRIMARY KEY,
          budget_id     TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
          threshold     REAL NOT NULL,
          period_label  TEXT NOT NULL,
          triggered_at  TEXT NOT NULL,
          actual_amount INTEGER NOT NULL,
          budget_amount INTEGER NOT NULL,
          dismissed     INTEGER NOT NULL DEFAULT 0,
          UNIQUE(budget_id, threshold, period_label)
        );

        UPDATE schema_version SET version = 3;
      `);
    },
  },
  {
    version: 4,
    description: 'Add recurring_debts and long_term_debts tables',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recurring_debts (
          id              TEXT PRIMARY KEY,
          name            TEXT NOT NULL,
          amount          INTEGER NOT NULL,
          category_id     TEXT NOT NULL,
          entity_id       TEXT,
          frequency       TEXT NOT NULL,
          start_date      TEXT NOT NULL,
          next_due_date   TEXT NOT NULL,
          end_date        TEXT,
          is_active       INTEGER NOT NULL DEFAULT 1,
          auto_post       INTEGER NOT NULL DEFAULT 1,
          estimated_amount INTEGER NOT NULL DEFAULT 0,
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS long_term_debts (
          id                    TEXT PRIMARY KEY,
          name                  TEXT NOT NULL,
          lender                TEXT NOT NULL,
          original_principal    INTEGER NOT NULL,
          current_principal     INTEGER NOT NULL,
          annual_interest_rate  REAL NOT NULL,
          monthly_payment       INTEGER NOT NULL,
          amortization_method   TEXT NOT NULL DEFAULT 'french',
          term_months           INTEGER NOT NULL,
          start_date            TEXT NOT NULL,
          entity_id             TEXT,
          category              TEXT NOT NULL,
          is_active             INTEGER NOT NULL DEFAULT 1,
          created_at            TEXT NOT NULL,
          updated_at            TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS amortization_entries (
          id                    TEXT PRIMARY KEY,
          debt_id               TEXT NOT NULL REFERENCES long_term_debts(id) ON DELETE CASCADE,
          period_number         INTEGER NOT NULL,
          due_date              TEXT NOT NULL,
          payment_amount        INTEGER NOT NULL,
          principal_amount      INTEGER NOT NULL,
          interest_amount       INTEGER NOT NULL,
          remaining_principal   INTEGER NOT NULL,
          linked_movement_id    TEXT,
          partial_amount_paid   INTEGER,
          status                TEXT NOT NULL DEFAULT 'pending',
          UNIQUE(debt_id, period_number)
        );

        CREATE INDEX IF NOT EXISTS idx_amortization_debt_id ON amortization_entries(debt_id);
        CREATE INDEX IF NOT EXISTS idx_amortization_due_date ON amortization_entries(due_date);

        UPDATE schema_version SET version = 4;
      `);
    },
  },
];

export async function runSQLiteMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Ensure schema_version table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);
  `);

  const result = await db.getFirstAsync<{ version: number }>('SELECT version FROM schema_version');
  const currentVersion = result?.version ?? 0;

  const pending = migrations.filter((m) => m.version > currentVersion);
  if (pending.length === 0) return;

  logger.info(`Running ${pending.length} SQLite migration(s)`, { from: currentVersion });

  for (const migration of pending) {
    try {
      // Each migration runs inside a transaction — partial failures leave no dirty state
      await db.withTransactionAsync(async () => {
        await migration.up(db);
      });
      logger.info(`SQLite migration v${migration.version} completed: ${migration.description}`);
    } catch (error) {
      logger.error(`SQLite migration v${migration.version} FAILED`, error);
      throw error;
    }
  }
}
```

---

## Migration Rules (Enforce These)

1. **Every schema change requires a numbered migration.** No exceptions, even for "small" changes.
2. **Migrations are append-only.** Never modify an existing migration. If you made a mistake in v2, fix it in v3.
3. **Each migration runs in a transaction.** A failed migration must not leave the database in a partial state.
4. **Migrations are tested.** Write a unit test for every migration that: (a) applies the migration to a database in the prior state, (b) verifies the schema is correct afterward, and (c) verifies existing data was not corrupted.
5. **Never delete old migration files.** They are the history of the schema and are needed to upgrade users who are many versions behind.
6. **Test the upgrade path from v0 (fresh install) and from every prior version.**

---

## Data Model Change Checklist

When changing `IMovement`, `IGoal`, or any other persisted type:

- [ ] Update the TypeScript interface in `features/*/types.ts`
- [ ] Write a new migration (AsyncStorage or SQLite depending on current phase)
- [ ] Update the repository implementation to read/write the new field
- [ ] Update the Zod validation schema in `features/*/domain/*Validator.ts`
- [ ] Write a migration unit test
- [ ] Test on a device that has existing data (simulate an upgrade)
- [ ] Bump `CURRENT_SCHEMA_VERSION` in `constants/AppConfig.ts`
