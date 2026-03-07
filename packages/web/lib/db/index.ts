import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@portfolio/db/schema";

const url = process.env["DATABASE_URL"] ?? "file:../../data/portfolio.db";
const filePath = url.startsWith("file:") ? url.slice(5) : url;

if (!filePath) throw new Error("DATABASE_URL is not configured");

const sqlite = new Database(filePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
