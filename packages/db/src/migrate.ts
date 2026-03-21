import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { fileURLToPath } from "url";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

export function runMigrations(dbPath: string) {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  // FK checks must be disabled at the connection level during migrations —
  // Drizzle wraps each migration in a transaction, so PRAGMA foreign_keys=OFF
  // inside the SQL has no effect inside a transaction.
  sqlite.pragma("foreign_keys = OFF");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder });
  sqlite.pragma("foreign_keys = ON");
  sqlite.close();
}
