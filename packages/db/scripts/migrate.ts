import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbUrl = process.env["DATABASE_URL"] ?? "../../data/portfolio.db";
const migrationsFolder = path.join(__dirname, "../src/migrations");

const sqlite = new Database(dbUrl);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);
migrate(db, { migrationsFolder });

console.log("Migrations applied successfully");
sqlite.close();
