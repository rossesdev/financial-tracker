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
    description: 'Recurring debts: recurring_debts + recurring_movement_links tables',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recurring_debts (
          id              TEXT PRIMARY KEY,
          name            TEXT NOT NULL,
          amount          INTEGER NOT NULL,
          category        TEXT NOT NULL,
          entity_id       TEXT,
          frequency       TEXT NOT NULL,
          start_date      TEXT NOT NULL,
          next_due_date   TEXT NOT NULL,
          end_date        TEXT,
          is_active       INTEGER NOT NULL DEFAULT 1,
          auto_post       INTEGER NOT NULL DEFAULT 0,
          estimated_amount INTEGER NOT NULL DEFAULT 0,
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recurring_movement_links (
          recurring_debt_id TEXT NOT NULL REFERENCES recurring_debts(id) ON DELETE CASCADE,
          movement_id       TEXT NOT NULL,
          period_label      TEXT NOT NULL,
          actual_amount     INTEGER NOT NULL,
          PRIMARY KEY (recurring_debt_id, period_label)
        );

        CREATE INDEX IF NOT EXISTS idx_recurring_debts_active
          ON recurring_debts(is_active, next_due_date);

        UPDATE schema_version SET version = 2;
      `);
    },
  },
  {
    version: 3,
    description: 'Budget limits: budgets, budget_categories, budget_entities, budget_alert_thresholds, budget_alerts',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS budgets (
          id              TEXT PRIMARY KEY,
          name            TEXT NOT NULL,
          limit_amount    INTEGER NOT NULL,
          period          TEXT NOT NULL,
          rollover        INTEGER NOT NULL DEFAULT 0,
          rollover_cap    INTEGER,
          is_active       INTEGER NOT NULL DEFAULT 1,
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS budget_categories (
          budget_id    TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
          category_id  TEXT NOT NULL,
          PRIMARY KEY (budget_id, category_id)
        );

        CREATE TABLE IF NOT EXISTS budget_entities (
          budget_id   TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
          entity_id   TEXT NOT NULL,
          PRIMARY KEY (budget_id, entity_id)
        );

        CREATE TABLE IF NOT EXISTS budget_alert_thresholds (
          budget_id  TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
          threshold  REAL NOT NULL,
          PRIMARY KEY (budget_id, threshold)
        );

        CREATE TABLE IF NOT EXISTS budget_alerts (
          id             TEXT PRIMARY KEY,
          budget_id      TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
          threshold      REAL NOT NULL,
          period_label   TEXT NOT NULL,
          triggered_at   TEXT NOT NULL,
          actual_amount  INTEGER NOT NULL,
          budget_amount  INTEGER NOT NULL,
          dismissed      INTEGER NOT NULL DEFAULT 0,
          UNIQUE(budget_id, threshold, period_label)
        );

        CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget_id ON budget_alerts(budget_id);

        UPDATE schema_version SET version = 3;
      `);
    },
  },
  {
    version: 4,
    description: 'Goal tracking: goals + goal_contributions tables',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS goals (
          id             TEXT PRIMARY KEY,
          name           TEXT NOT NULL,
          description    TEXT,
          target_amount  INTEGER NOT NULL,
          target_date    TEXT,
          entity_id      TEXT,
          category       TEXT NOT NULL,
          status         TEXT NOT NULL DEFAULT 'active',
          icon           TEXT,
          color          TEXT,
          created_at     TEXT NOT NULL,
          updated_at     TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS goal_contributions (
          id          TEXT PRIMARY KEY,
          goal_id     TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
          movement_id TEXT,
          amount      INTEGER NOT NULL,
          date        TEXT NOT NULL,
          note        TEXT,
          created_at  TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id
          ON goal_contributions(goal_id);
        CREATE INDEX IF NOT EXISTS idx_goal_contributions_movement_id
          ON goal_contributions(movement_id);

        UPDATE schema_version SET version = 4;
      `);
    },
  },
];

/**
 * Runs all pending SQLite migrations in sequence.
 * Each migration runs inside a transaction — a partial failure leaves no dirty state.
 * Call this once on app start, before any store hydration.
 */
export async function runSQLiteMigrations(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  // Ensure schema_version table exists (for fresh installs)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);
  `);

  const result = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version'
  );
  const currentVersion = result?.version ?? 0;

  const pending = migrations.filter((m) => m.version > currentVersion);

  if (pending.length === 0) {
    logger.info('SQLite schema is up to date', { version: currentVersion });
    return;
  }

  logger.info(`Running ${pending.length} SQLite migration(s)`, {
    from: currentVersion,
  });

  for (const migration of pending) {
    try {
      await db.withTransactionAsync(async () => {
        await migration.up(db);
      });
      logger.info(
        `SQLite migration v${migration.version} completed: ${migration.description}`
      );
    } catch (error) {
      logger.error(`SQLite migration v${migration.version} FAILED`, error);
      throw error;
    }
  }
}
