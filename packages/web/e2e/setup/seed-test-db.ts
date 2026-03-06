import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { hash } from "@node-rs/argon2";

// Paths relative to packages/web/ (CWD when playwright runs)
const DB_DIR = join(process.cwd(), "data");
const DB_PATH = join(DB_DIR, "test.db");
const MIGRATIONS_DIR = join(process.cwd(), "../db/src/migrations");

export default async function globalSetup() {
  // Fresh DB every run
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  if (existsSync(DB_PATH)) rmSync(DB_PATH);

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Apply migrations
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });

  // Seed test user: testuser / testpassword123
  const passwordHash = await hash("testpassword123");
  const now = Date.now();

  sqlite
    .prepare(
      "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(randomUUID(), "testuser", passwordHash, now);

  sqlite.close();
}
