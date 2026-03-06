import { describe, expect, it } from "vitest";
import {
  calculateCostBasisAverage,
  calculateCostBasisFIFO,
} from "../../calculations/cost-basis.js";
import type { TransactionRecord } from "../../types/index.js";

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

describe("calculateCostBasisFIFO", () => {
  it("single buy, no sells", () => {
    const txs = [buy("2024-01-01", 10, 100)];
    const result = calculateCostBasisFIFO(txs);
    expect(result.totalQuantity).toBe(10);
    expect(result.totalCost).toBeCloseTo(1000);
    expect(result.averageCostPerShare).toBeCloseTo(100);
    expect(result.lots).toHaveLength(1);
  });

  it("multiple buys at different prices", () => {
    const txs = [buy("2024-01-01", 10, 100), buy("2024-02-01", 5, 120)];
    const result = calculateCostBasisFIFO(txs);
    expect(result.totalQuantity).toBe(15);
    expect(result.totalCost).toBeCloseTo(1600);
    expect(result.averageCostPerShare).toBeCloseTo(1600 / 15);
  });

  it("FIFO: sell consumes oldest lot first", () => {
    const txs = [
      buy("2024-01-01", 10, 100),
      buy("2024-02-01", 10, 150),
      sell("2024-03-01", 10, 200),
    ];
    const result = calculateCostBasisFIFO(txs);
    // First lot consumed, only second lot remains
    expect(result.totalQuantity).toBe(10);
    expect(result.lots).toHaveLength(1);
    expect(result.lots[0]?.costPerShare).toBeCloseTo(150);
    expect(result.averageCostPerShare).toBeCloseTo(150);
  });

  it("FIFO: partial lot consumption", () => {
    const txs = [
      buy("2024-01-01", 10, 100),
      sell("2024-02-01", 6, 150),
    ];
    const result = calculateCostBasisFIFO(txs);
    expect(result.totalQuantity).toBe(4);
    expect(result.lots[0]?.quantity).toBe(4);
    expect(result.averageCostPerShare).toBeCloseTo(100);
  });

  it("includes fees in cost per share", () => {
    const txs = [buy("2024-01-01", 10, 100, 10)]; // $10 fees
    const result = calculateCostBasisFIFO(txs);
    expect(result.averageCostPerShare).toBeCloseTo(101); // 100 + 10/10
  });

  it("dividends do not affect cost basis", () => {
    const txs: TransactionRecord[] = [
      buy("2024-01-01", 10, 100),
      { date: new Date("2024-06-01"), type: "dividend", quantity: 10, price: 2, fees: 0, currency: "USD" },
    ];
    const result = calculateCostBasisFIFO(txs);
    expect(result.totalQuantity).toBe(10);
    expect(result.averageCostPerShare).toBeCloseTo(100);
  });

  it("empty transactions", () => {
    const result = calculateCostBasisFIFO([]);
    expect(result.totalQuantity).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.averageCostPerShare).toBe(0);
    expect(result.lots).toHaveLength(0);
  });

  it("sell all shares clears lots", () => {
    const txs = [buy("2024-01-01", 10, 100), sell("2024-02-01", 10, 150)];
    const result = calculateCostBasisFIFO(txs);
    expect(result.totalQuantity).toBe(0);
    expect(result.lots).toHaveLength(0);
  });
});

describe("calculateCostBasisAverage", () => {
  it("single buy", () => {
    const result = calculateCostBasisAverage([buy("2024-01-01", 10, 100)]);
    expect(result.totalQuantity).toBe(10);
    expect(result.averageCostPerShare).toBeCloseTo(100);
    expect(result.totalCost).toBeCloseTo(1000);
  });

  it("two buys: weighted average", () => {
    const txs = [buy("2024-01-01", 10, 100), buy("2024-02-01", 10, 200)];
    const result = calculateCostBasisAverage(txs);
    expect(result.totalQuantity).toBe(20);
    expect(result.averageCostPerShare).toBeCloseTo(150);
    expect(result.totalCost).toBeCloseTo(3000);
  });

  it("buy then sell: reduces quantity", () => {
    const txs = [buy("2024-01-01", 10, 100), sell("2024-02-01", 5, 150)];
    const result = calculateCostBasisAverage(txs);
    expect(result.totalQuantity).toBe(5);
    expect(result.averageCostPerShare).toBeCloseTo(100);
  });

  it("includes fees in average", () => {
    const txs = [buy("2024-01-01", 10, 100, 20)]; // $20 fees
    const result = calculateCostBasisAverage(txs);
    expect(result.totalCost).toBeCloseTo(1020);
    expect(result.averageCostPerShare).toBeCloseTo(102);
  });
});
