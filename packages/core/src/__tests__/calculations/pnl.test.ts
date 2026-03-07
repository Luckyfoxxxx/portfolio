import { describe, expect, it } from "vitest";
import {
  calculatePnL,
  calculatePortfolioPnL,
  calculateRealizedPnL,
} from "../../calculations/pnl";
import type { HoldingSnapshot, TransactionRecord } from "../../types/index";

const makeSnapshot = (
  symbol: string,
  quantity: number,
  avgCostBasis: number,
  currentPrice: number
): HoldingSnapshot => ({
  symbol,
  quantity,
  avgCostBasis,
  currency: "USD",
  currentPrice,
});

const buy = (
  date: string,
  quantity: number,
  price: number,
  fees = 0
): TransactionRecord => ({
  date: new Date(date),
  type: "buy",
  quantity,
  price,
  fees,
  currency: "USD",
});

const sell = (
  date: string,
  quantity: number,
  price: number,
  fees = 0
): TransactionRecord => ({
  date: new Date(date),
  type: "sell",
  quantity,
  price,
  fees,
  currency: "USD",
});

describe("calculatePnL", () => {
  it("simple profit: bought at 100, now 150", () => {
    const snapshot = makeSnapshot("AAPL", 10, 100, 150);
    const txs = [buy("2024-01-01", 10, 100)];
    const result = calculatePnL(snapshot, txs);
    expect(result.currentValue).toBeCloseTo(1500);
    expect(result.totalCost).toBeCloseTo(1000);
    expect(result.unrealizedPnL).toBeCloseTo(500);
    expect(result.unrealizedPnLPercent).toBeCloseTo(50);
    expect(result.realizedPnL).toBeCloseTo(0);
  });

  it("simple loss: bought at 100, now 80", () => {
    const snapshot = makeSnapshot("AAPL", 10, 100, 80);
    const txs = [buy("2024-01-01", 10, 100)];
    const result = calculatePnL(snapshot, txs);
    expect(result.unrealizedPnL).toBeCloseTo(-200);
    expect(result.unrealizedPnLPercent).toBeCloseTo(-20);
  });

  it("partial sell with realized P&L", () => {
    const snapshot = makeSnapshot("AAPL", 5, 100, 150);
    const txs = [buy("2024-01-01", 10, 100), sell("2024-06-01", 5, 130)];
    const result = calculatePnL(snapshot, txs);
    // Realized: 5 * (130 - 100) = 150 (sell proceeds - fees - cost basis)
    expect(result.realizedPnL).toBeCloseTo(150);
    // Unrealized: 5 * 150 - 5 * 100 = 250
    expect(result.unrealizedPnL).toBeCloseTo(250);
  });

  it("zero cost basis returns 0%", () => {
    const snapshot = makeSnapshot("AAPL", 0, 0, 150);
    const txs: TransactionRecord[] = [];
    const result = calculatePnL(snapshot, txs);
    expect(result.unrealizedPnLPercent).toBe(0);
  });

  it("includes fees in cost basis", () => {
    const snapshot = makeSnapshot("AAPL", 10, 101, 101);
    const txs = [buy("2024-01-01", 10, 100, 10)]; // $10 fees → $101/share
    const result = calculatePnL(snapshot, txs);
    expect(result.totalCost).toBeCloseTo(1010);
    expect(result.unrealizedPnL).toBeCloseTo(0); // bought at 101, now at 101
  });
});

describe("calculateRealizedPnL", () => {
  it("no sells returns 0", () => {
    expect(calculateRealizedPnL([buy("2024-01-01", 10, 100)])).toBe(0);
  });

  it("sell at profit", () => {
    const txs = [buy("2024-01-01", 10, 100), sell("2024-06-01", 10, 150)];
    // proceeds = 10 * 150 = 1500, cost = 10 * 100 = 1000
    expect(calculateRealizedPnL(txs)).toBeCloseTo(500);
  });

  it("sell at loss", () => {
    const txs = [buy("2024-01-01", 10, 100), sell("2024-06-01", 10, 80)];
    expect(calculateRealizedPnL(txs)).toBeCloseTo(-200);
  });

  it("dividends add to realized P&L", () => {
    const txs: TransactionRecord[] = [
      buy("2024-01-01", 10, 100),
      { date: new Date("2024-06-01"), type: "dividend", quantity: 10, price: 1.5, fees: 0, currency: "USD" },
    ];
    // dividend: 10 * 1.5 = 15
    expect(calculateRealizedPnL(txs)).toBeCloseTo(15);
  });

  it("FIFO ordering: sell consumes cheapest lots first", () => {
    const txs = [
      buy("2024-01-01", 5, 100), // lot 1: 5 @ $100
      buy("2024-02-01", 5, 200), // lot 2: 5 @ $200
      sell("2024-03-01", 5, 300), // sells lot 1: profit = 5 * (300 - 100) = 1000
    ];
    expect(calculateRealizedPnL(txs)).toBeCloseTo(1000);
  });
});

describe("calculatePortfolioPnL", () => {
  it("aggregates multiple holdings", () => {
    const holdings = [
      {
        snapshot: makeSnapshot("AAPL", 10, 100, 150),
        transactions: [buy("2024-01-01", 10, 100)],
      },
      {
        snapshot: makeSnapshot("MSFT", 5, 200, 180),
        transactions: [buy("2024-01-01", 5, 200)],
      },
    ];
    const result = calculatePortfolioPnL(holdings);
    // AAPL: value=1500, cost=1000, pnl=500
    // MSFT: value=900, cost=1000, pnl=-100
    expect(result.currentValue).toBeCloseTo(2400);
    expect(result.totalCost).toBeCloseTo(2000);
    expect(result.unrealizedPnL).toBeCloseTo(400);
    expect(result.unrealizedPnLPercent).toBeCloseTo(20);
  });

  it("empty portfolio", () => {
    const result = calculatePortfolioPnL([]);
    expect(result.unrealizedPnL).toBe(0);
    expect(result.realizedPnL).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.currentValue).toBe(0);
    expect(result.unrealizedPnLPercent).toBe(0);
  });
});
