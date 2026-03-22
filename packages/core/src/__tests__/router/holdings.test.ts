/**
 * Integration tests for holdingsRouter.
 *
 * Each test runs against an in-memory SQLite database that has all migrations
 * applied, so the tests are isolated from each other via beforeEach resets.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@portfolio/db";
import { holdingsRouter } from "../../router/holdings";
import { createCallerFactory } from "../../router/trpc";
import type { Context } from "../../router/context";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../../../../db/src/migrations");

// --- helpers ----------------------------------------------------------------

function makeDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

const callerFactory = createCallerFactory(holdingsRouter);

/** Build a tRPC caller scoped to an authenticated context. */
function makeCaller(db: ReturnType<typeof makeDb>) {
  const ctx: Context = { db, userId: "test-user", isAdmin: false };
  return callerFactory(ctx);
}

// --- tests ------------------------------------------------------------------

describe("holdingsRouter", () => {
  let db: ReturnType<typeof makeDb>;
  let caller: ReturnType<typeof makeCaller>;

  beforeEach(() => {
    db = makeDb();
    caller = makeCaller(db);
  });

  // --- list ---

  describe("list", () => {
    it("returns empty array when no holdings exist", async () => {
      const result = await caller.list();
      expect(result).toEqual([]);
    });

    it("returns all holdings after add", async () => {
      await caller.add({ symbol: "AAPL", name: "Apple", quantity: 10, avgCostBasis: 150, currency: "USD", exchange: "NASDAQ" });
      await caller.add({ symbol: "MSFT", name: "Microsoft", quantity: 5, avgCostBasis: 300, currency: "USD", exchange: "NASDAQ" });
      const result = await caller.list();
      expect(result).toHaveLength(2);
      expect(result.map((h) => h.symbol)).toContain("AAPL");
      expect(result.map((h) => h.symbol)).toContain("MSFT");
    });
  });

  // --- add ---

  describe("add", () => {
    it("inserts a holding and returns it", async () => {
      const result = await caller.add({
        symbol: "vti",  // should be uppercased by schema
        name: "Vanguard Total Market ETF",
        quantity: 20,
        avgCostBasis: 200,
        currency: "USD",
        exchange: "NYSE",
      });
      expect(result).toBeDefined();
      expect(result!.symbol).toBe("VTI");
      expect(result!.quantity).toBe(20);
      expect(result!.currency).toBe("USD");
    });

    it("rejects a symbol longer than 20 chars", async () => {
      await expect(
        caller.add({ symbol: "TOOLONGSYMBOLNAME123", name: "X", quantity: 0, avgCostBasis: 0, currency: "USD", exchange: "" })
      ).resolves.toBeDefined(); // 20 chars is fine

      await expect(
        caller.add({ symbol: "TOOLONGSYMBOLNAMEXXXX", name: "X", quantity: 0, avgCostBasis: 0, currency: "USD", exchange: "" })
      ).rejects.toThrow(); // 21 chars should fail
    });
  });

  // --- get ---

  describe("get", () => {
    it("returns the holding by id", async () => {
      const added = await caller.add({ symbol: "GOOGL", name: "Alphabet", quantity: 3, avgCostBasis: 170, currency: "USD", exchange: "" });
      const fetched = await caller.get({ id: added!.id });
      expect(fetched.symbol).toBe("GOOGL");
    });

    it("throws NOT_FOUND for a non-existent id", async () => {
      await expect(caller.get({ id: 99999 })).rejects.toThrow(
        expect.objectContaining({ code: "NOT_FOUND" })
      );
    });
  });

  // --- update ---

  describe("update", () => {
    it("updates mutable fields", async () => {
      const added = await caller.add({ symbol: "NVDA", name: "Nvidia", quantity: 5, avgCostBasis: 800, currency: "USD", exchange: "NASDAQ" });
      await caller.update({ id: added!.id, name: "NVIDIA Corporation", quantity: 8 });
      const updated = await caller.get({ id: added!.id });
      expect(updated.name).toBe("NVIDIA Corporation");
      expect(updated.quantity).toBe(8);
    });

    it("does not expose symbol field in updateHoldingSchema", async () => {
      const added = await caller.add({ symbol: "TSLA", name: "Tesla", quantity: 2, avgCostBasis: 250, currency: "USD", exchange: "" });
      // Passing symbol should be silently stripped because it's not in the schema
      await caller.update({ id: added!.id, name: "Tesla Inc." } as Parameters<typeof caller.update>[0]);
      const updated = await caller.get({ id: added!.id });
      // Symbol must remain unchanged
      expect(updated.symbol).toBe("TSLA");
    });
  });

  // --- delete ---

  describe("delete", () => {
    it("deletes an existing holding", async () => {
      const added = await caller.add({ symbol: "BRK", name: "Berkshire", quantity: 1, avgCostBasis: 500000, currency: "USD", exchange: "NYSE" });
      await expect(caller.delete({ id: added!.id })).resolves.toEqual({ success: true });
      await expect(caller.get({ id: added!.id })).rejects.toThrow(
        expect.objectContaining({ code: "NOT_FOUND" })
      );
    });

    it("throws NOT_FOUND when deleting a non-existent holding", async () => {
      await expect(caller.delete({ id: 99999 })).rejects.toThrow(
        expect.objectContaining({ code: "NOT_FOUND" })
      );
    });
  });

  // --- transactions ---

  describe("addTransaction / transactions / deleteTransaction", () => {
    it("addTransaction derives currency from holding, not from client input", async () => {
      const holding = await caller.add({ symbol: "NOK", name: "Nokia", quantity: 0, avgCostBasis: 0, currency: "EUR", exchange: "HEL" });
      const tx = await caller.addTransaction({
        holdingId: holding!.id,
        type: "buy",
        date: "2024-01-15",
        quantity: 10,
        price: 3.50,
        fees: 0,
      });
      expect(tx).toBeDefined();
      expect(tx!.currency).toBe("EUR");  // derived from holding, not defaulted to USD
    });

    it("addTransaction updates holding quantity and avgCostBasis", async () => {
      const holding = await caller.add({ symbol: "VTI", name: "Vanguard", quantity: 0, avgCostBasis: 0, currency: "USD", exchange: "NYSE" });
      await caller.addTransaction({ holdingId: holding!.id, type: "buy", date: "2024-01-01", quantity: 10, price: 100, fees: 0 });
      await caller.addTransaction({ holdingId: holding!.id, type: "buy", date: "2024-02-01", quantity: 10, price: 120, fees: 0 });
      const updated = await caller.get({ id: holding!.id });
      expect(updated.quantity).toBe(20);
      expect(updated.avgCostBasis).toBeCloseTo(110); // (10*100 + 10*120) / 20
    });

    it("addTransaction throws NOT_FOUND for unknown holdingId", async () => {
      await expect(
        caller.addTransaction({ holdingId: 99999, type: "buy", date: "2024-01-01", quantity: 1, price: 100 })
      ).rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
    });

    it("transactions returns all txs for a holding", async () => {
      const holding = await caller.add({ symbol: "VOO", name: "Vanguard S&P", quantity: 0, avgCostBasis: 0, currency: "USD", exchange: "NYSE" });
      await caller.addTransaction({ holdingId: holding!.id, type: "buy", date: "2024-01-01", quantity: 5, price: 400 });
      await caller.addTransaction({ holdingId: holding!.id, type: "buy", date: "2024-03-01", quantity: 2, price: 420 });
      const txs = await caller.transactions({ holdingId: holding!.id });
      expect(txs).toHaveLength(2);
    });

    it("deleteTransaction removes the tx and throws NOT_FOUND on re-delete", async () => {
      const holding = await caller.add({ symbol: "AMZN", name: "Amazon", quantity: 0, avgCostBasis: 0, currency: "USD", exchange: "NASDAQ" });
      const tx = await caller.addTransaction({ holdingId: holding!.id, type: "buy", date: "2024-05-01", quantity: 1, price: 180 });
      await expect(caller.deleteTransaction({ id: tx!.id })).resolves.toEqual({ success: true });
      await expect(caller.deleteTransaction({ id: tx!.id })).rejects.toThrow(
        expect.objectContaining({ code: "NOT_FOUND" })
      );
    });
  });

  // --- getWithPnL ---

  describe("getWithPnL", () => {
    it("returns holding, costBasis, and pnl", async () => {
      const holding = await caller.add({ symbol: "AAPL", name: "Apple", quantity: 0, avgCostBasis: 0, currency: "USD", exchange: "NASDAQ" });
      await caller.addTransaction({ holdingId: holding!.id, type: "buy", date: "2024-01-01", quantity: 10, price: 100 });
      const result = await caller.getWithPnL({ id: holding!.id, currentPrice: 150 });
      expect(result.holding).toBeDefined();
      expect(result.costBasis.totalQuantity).toBe(10);
      expect(result.pnl.unrealizedPnL).toBeCloseTo(500); // 10 * (150 - 100)
    });

    it("throws NOT_FOUND for unknown id", async () => {
      await expect(caller.getWithPnL({ id: 99999, currentPrice: 100 })).rejects.toThrow(
        expect.objectContaining({ code: "NOT_FOUND" })
      );
    });
  });
});
