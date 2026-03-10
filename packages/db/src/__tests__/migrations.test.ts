import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../schema/index";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../migrations");
const MIGRATION_SQL = join(MIGRATIONS_DIR, "0000_curious_deadpool.sql");

describe("migrations", () => {
  let sqlite: Database.Database;

  beforeAll(() => {
    sqlite = new Database(":memory:");
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  });

  it("migration SQL file exists and is non-empty", () => {
    expect(existsSync(MIGRATION_SQL)).toBe(true);
    const sql = readFileSync(MIGRATION_SQL, "utf-8");
    expect(sql.trim().length).toBeGreaterThan(0);
  });

  const EXPECTED_TABLES = [
    "users",
    "sessions",
    "holdings",
    "transactions",
    "price_snapshots",
    "news_items",
    "cron_runs",
  ];

  it("creates all 7 expected tables", () => {
    const rows = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tableNames = rows.map((r) => r.name);
    for (const table of EXPECTED_TABLES) {
      expect(tableNames, `missing table: ${table}`).toContain(table);
    }
  });

  it("users table accepts a valid row", () => {
    expect(() => {
      sqlite
        .prepare(
          "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)"
        )
        .run("user-1", "alice", "$argon2id$dummy", Date.now());
    }).not.toThrow();
  });

  it("users table defaults is_admin to 0", () => {
    const user = sqlite
      .prepare("SELECT is_admin FROM users WHERE id = 'user-1'")
      .get() as { is_admin: number };
    expect(user.is_admin).toBe(0);
  });

  it("sessions table accepts a valid row (fk users)", () => {
    const now = Date.now();
    expect(() => {
      sqlite
        .prepare(
          "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
        )
        .run("sess-1", "user-1", now + 86_400_000, now);
    }).not.toThrow();
  });

  it("holdings table accepts a valid row", () => {
    const now = Date.now();
    expect(() => {
      sqlite
        .prepare(
          "INSERT INTO holdings (symbol, name, quantity, avg_cost_basis, currency, exchange, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run("AAPL", "Apple Inc.", 10, 150.0, "USD", "NASDAQ", now, now);
    }).not.toThrow();
  });

  it("transactions table accepts a valid row (fk holdings)", () => {
    const now = Date.now();
    const holding = sqlite
      .prepare("SELECT id FROM holdings WHERE symbol = 'AAPL'")
      .get() as { id: number };
    expect(() => {
      sqlite
        .prepare(
          "INSERT INTO transactions (holding_id, symbol, type, date, quantity, price, fees, currency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(holding.id, "AAPL", "buy", now, 10, 150.0, 0, "USD", now);
    }).not.toThrow();
  });

  it("price_snapshots table accepts a valid row", () => {
    const now = Date.now();
    expect(() => {
      sqlite
        .prepare(
          "INSERT INTO price_snapshots (symbol, price, currency, source, timestamp, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run("AAPL", 155.0, "USD", "yahoo", now, now);
    }).not.toThrow();
  });

  it("news_items table accepts a valid row", () => {
    const now = Date.now();
    expect(() => {
      sqlite
        .prepare(
          "INSERT INTO news_items (symbol, headline, url, published_at, created_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run("AAPL", "Apple reports record earnings", "https://example.com", now, now);
    }).not.toThrow();
  });

  it("cron_runs table accepts a valid row", () => {
    const now = Date.now();
    expect(() => {
      sqlite
        .prepare(
          "INSERT INTO cron_runs (started_at, finished_at, status, symbols_attempted, symbols_refreshed, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(now, now + 5000, "success", 7, 7, null, now);
    }).not.toThrow();
  });

  it("cron_runs round-trip: inserted row can be retrieved", () => {
    const row = sqlite
      .prepare("SELECT * FROM cron_runs WHERE status = 'success'")
      .get() as { symbols_attempted: number; symbols_refreshed: number; status: string };
    expect(row).toBeDefined();
    expect(row.symbols_attempted).toBe(7);
    expect(row.symbols_refreshed).toBe(7);
    expect(row.status).toBe("success");
  });
});
