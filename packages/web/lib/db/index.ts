import { createDb } from "@portfolio/db";

const url = process.env["DATABASE_URL"] ?? "file:../../data/portfolio.db";

// Strip the "file:" prefix for better-sqlite3
const filePath = url.startsWith("file:") ? url.slice(5) : url;

export const db = createDb(filePath);
