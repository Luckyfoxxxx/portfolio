import { describe, expect, it } from "vitest";
import {
  annualizeReturn,
  calculateTimeWeightedReturn,
  calculateTotalReturn,
} from "../../calculations/returns";
import type { PeriodReturn } from "../../calculations/returns";

const makePeriod = (
  returnPercent: number,
  startValue = 1000,
  endValue = 0
): PeriodReturn => ({
  periodStart: new Date("2024-01-01"),
  periodEnd: new Date("2024-06-01"),
  startValue,
  endValue: endValue || startValue * (1 + returnPercent / 100),
  cashFlows: 0,
  return: startValue * (returnPercent / 100),
  returnPercent,
});

describe("calculateTotalReturn", () => {
  it("simple profit", () => {
    const { totalReturn, totalReturnPercent } = calculateTotalReturn(1000, 1500);
    expect(totalReturn).toBeCloseTo(500);
    expect(totalReturnPercent).toBeCloseTo(50);
  });

  it("simple loss", () => {
    const { totalReturn, totalReturnPercent } = calculateTotalReturn(1000, 800);
    expect(totalReturn).toBeCloseTo(-200);
    expect(totalReturnPercent).toBeCloseTo(-20);
  });

  it("no change", () => {
    const { totalReturn, totalReturnPercent } = calculateTotalReturn(1000, 1000);
    expect(totalReturn).toBe(0);
    expect(totalReturnPercent).toBe(0);
  });

  it("includes dividends", () => {
    const { totalReturn, totalReturnPercent } = calculateTotalReturn(
      1000,
      1000,
      100
    );
    expect(totalReturn).toBeCloseTo(100);
    expect(totalReturnPercent).toBeCloseTo(10);
  });

  it("zero initial value returns 0%", () => {
    const { totalReturnPercent } = calculateTotalReturn(0, 500);
    expect(totalReturnPercent).toBe(0);
  });
});

describe("calculateTimeWeightedReturn", () => {
  it("empty periods returns 0", () => {
    expect(calculateTimeWeightedReturn([])).toBe(0);
  });

  it("single period 10% return", () => {
    const periods = [makePeriod(10)];
    expect(calculateTimeWeightedReturn(periods)).toBeCloseTo(10);
  });

  it("two periods: compounds correctly", () => {
    // 10% then 10% = 21% compounded
    const periods = [makePeriod(10), makePeriod(10)];
    expect(calculateTimeWeightedReturn(periods)).toBeCloseTo(21);
  });

  it("gain then equal loss compounds to near zero", () => {
    // +50% then -33.33% = back to start
    const periods = [makePeriod(50), makePeriod(-33.333)];
    expect(calculateTimeWeightedReturn(periods)).toBeCloseTo(0, 0);
  });

  it("negative return", () => {
    const periods = [makePeriod(-20)];
    expect(calculateTimeWeightedReturn(periods)).toBeCloseTo(-20);
  });
});

describe("annualizeReturn", () => {
  it("1-year return is unchanged", () => {
    expect(annualizeReturn(10, 365.25)).toBeCloseTo(10, 1);
  });

  it("2-year 21% total ≈ 10% annual", () => {
    expect(annualizeReturn(21, 730.5)).toBeCloseTo(10, 0);
  });

  it("zero days returns 0", () => {
    expect(annualizeReturn(10, 0)).toBe(0);
  });

  it("negative days returns 0", () => {
    expect(annualizeReturn(10, -10)).toBe(0);
  });

  it("6-month 10% total ≈ ~21% annual", () => {
    expect(annualizeReturn(10, 182.625)).toBeCloseTo(21, 0);
  });
});
