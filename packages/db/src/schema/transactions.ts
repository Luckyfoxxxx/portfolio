import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { holdings } from "./holdings.js";

export const transactionTypeValues = ["buy", "sell", "dividend"] as const;
export type TransactionType = (typeof transactionTypeValues)[number];

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  holdingId: integer("holding_id")
    .notNull()
    .references(() => holdings.id),
  symbol: text("symbol").notNull(),
  type: text("type", { enum: transactionTypeValues }).notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  fees: real("fees").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
