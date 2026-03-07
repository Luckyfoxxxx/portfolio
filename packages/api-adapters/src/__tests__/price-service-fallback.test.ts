import { describe, expect, it, vi } from "vitest";
import type { PriceQuote, PriceService } from "../types";
import { PriceServiceWithFallback } from "../price-service";

const makeQuote = (symbol: string, price: number): PriceQuote => ({
  symbol,
  price,
  currency: "USD",
  timestamp: new Date(),
  source: "test",
});

const makeAdapter = (
  result: PriceQuote | Error,
  historyResult?: Error
): PriceService => ({
  getQuote: vi.fn().mockImplementation(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result)
  ),
  getQuotes: vi.fn().mockResolvedValue([]),
  getHistory: vi.fn().mockImplementation(() =>
    historyResult
      ? Promise.reject(historyResult)
      : Promise.resolve([])
  ),
});

describe("PriceServiceWithFallback", () => {
  it("returns primary result when successful", async () => {
    const primary = makeAdapter(makeQuote("AAPL", 150));
    const fallback = makeAdapter(makeQuote("AAPL", 999));
    const service = new PriceServiceWithFallback(primary, [fallback]);

    const quote = await service.getQuote("AAPL");
    expect(quote.price).toBe(150);
    expect(primary.getQuote).toHaveBeenCalledOnce();
    expect(fallback.getQuote).not.toHaveBeenCalled();
  });

  it("falls back to secondary on primary failure", async () => {
    const primary = makeAdapter(new Error("Primary failed"));
    const fallback = makeAdapter(makeQuote("AAPL", 200));
    const service = new PriceServiceWithFallback(primary, [fallback]);

    const quote = await service.getQuote("AAPL");
    expect(quote.price).toBe(200);
    expect(primary.getQuote).toHaveBeenCalledOnce();
    expect(fallback.getQuote).toHaveBeenCalledOnce();
  });

  it("throws AggregateError when all adapters fail", async () => {
    const primary = makeAdapter(new Error("Primary failed"));
    const fallback = makeAdapter(new Error("Fallback failed"));
    const service = new PriceServiceWithFallback(primary, [fallback]);

    await expect(service.getQuote("FAIL")).rejects.toThrow(AggregateError);
  });

  it("tries multiple fallbacks in order", async () => {
    const primary = makeAdapter(new Error("fail"));
    const fallback1 = makeAdapter(new Error("fail"));
    const fallback2 = makeAdapter(makeQuote("AAPL", 300));
    const service = new PriceServiceWithFallback(primary, [fallback1, fallback2]);

    const quote = await service.getQuote("AAPL");
    expect(quote.price).toBe(300);
  });

  it("getQuotes returns successful quotes", async () => {
    const primary = makeAdapter(makeQuote("AAPL", 150));
    const service = new PriceServiceWithFallback(primary);

    const quotes = await service.getQuotes(["AAPL"]);
    expect(quotes).toHaveLength(1);
    expect(quotes[0]?.price).toBe(150);
  });

  it("getHistory falls back on primary failure", async () => {
    const primary = makeAdapter(
      makeQuote("AAPL", 0),
      new Error("no history")
    );
    const fallback = makeAdapter(makeQuote("AAPL", 0));
    const service = new PriceServiceWithFallback(primary, [fallback]);

    const bars = await service.getHistory("AAPL", new Date(), new Date());
    expect(bars).toEqual([]);
  });
});
