import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cronRuns = sqliteTable("cron_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  status: text("status", { enum: ["success", "partial", "failed"] }).notNull(),
  symbolsAttempted: integer("symbols_attempted").notNull(),
  symbolsRefreshed: integer("symbols_refreshed").notNull(),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type CronRun = typeof cronRuns.$inferSelect;
