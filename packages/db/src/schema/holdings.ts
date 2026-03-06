import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const holdings = sqliteTable("holdings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  quantity: real("quantity").notNull(),
  avgCostBasis: real("avg_cost_basis").notNull(),
  currency: text("currency").notNull().default("USD"),
  exchange: text("exchange").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Holding = typeof holdings.$inferSelect;
export type NewHolding = typeof holdings.$inferInsert;
