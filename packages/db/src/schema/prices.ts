import { check, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const priceSnapshots = sqliteTable("price_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("USD"),
  source: text("source").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type NewPriceSnapshot = typeof priceSnapshots.$inferInsert;

export const newsItems = sqliteTable(
  "news_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol").notNull(),
    headline: text("headline").notNull(),
    url: text("url").notNull(),
    source: text("source"),
    publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    // Reject non-HTTP(S) URLs at the DB level (blocks javascript:, data:, etc.)
    check("url_is_http", sql`${table.url} LIKE 'http://%' OR ${table.url} LIKE 'https://%'`),
    // Cap headline and source length to limit stored XSS pre-condition surface
    check("headline_max_len", sql`length(${table.headline}) <= 512`),
    check("source_max_len", sql`${table.source} IS NULL OR length(${table.source}) <= 128`),
  ],
);

export type NewsItem = typeof newsItems.$inferSelect;
export type NewNewsItem = typeof newsItems.$inferInsert;
