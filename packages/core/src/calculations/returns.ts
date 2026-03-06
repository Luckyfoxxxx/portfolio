import type { TransactionRecord } from "../types/index.js";

export interface PeriodReturn {
  periodStart: Date;
  periodEnd: Date;
  startValue: number;
  endValue: number;
  cashFlows: number;
  return: number;
  returnPercent: number;
}

/**
 * Calculates simple total return.
 */
export function calculateTotalReturn(
  initialValue: number,
  currentValue: number,
  dividends = 0
): { totalReturn: number; totalReturnPercent: number } {
  const totalReturn = currentValue - initialValue + dividends;
  const totalReturnPercent =
    initialValue > 0 ? (totalReturn / initialValue) * 100 : 0;
  return { totalReturn, totalReturnPercent };
}

/**
 * Calculates time-weighted return (TWR) using Modified Dietz method approximation.
 * TWR eliminates the effect of external cash flows (contributions/withdrawals).
 *
 * Formula: TWR = Product of (1 + HPR_i) - 1
 * where HPR_i = (End Value - Begin Value - Cash Flow) / (Begin Value + Weighted Cash Flows)
 */
export function calculateTimeWeightedReturn(periods: PeriodReturn[]): number {
  if (periods.length === 0) return 0;

  let twr = 1;
  for (const period of periods) {
    const hpr = period.endValue !== 0 ? 1 + period.returnPercent / 100 : 1;
    twr *= hpr;
  }

  return (twr - 1) * 100;
}

/**
 * Calculates annualized return from a total return over a period in days.
 */
export function annualizeReturn(
  totalReturnPercent: number,
  days: number
): number {
  if (days <= 0) return 0;
  const years = days / 365.25;
  return (Math.pow(1 + totalReturnPercent / 100, 1 / years) - 1) * 100;
}

/**
 * Groups transactions into sub-periods for TWR calculation.
 * Each external cash flow (buy/sell) creates a new sub-period.
 */
export function buildPeriods(
  transactions: TransactionRecord[],
  priceHistory: Array<{ date: Date; price: number }>,
  currentPrice: number
): PeriodReturn[] {
  if (transactions.length === 0 || priceHistory.length === 0) return [];

  const sorted = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const priceMap = new Map(
    priceHistory.map((p) => [p.date.toISOString().split("T")[0], p.price])
  );

  const getPriceOn = (date: Date): number => {
    const key = date.toISOString().split("T")[0];
    return priceMap.get(key) ?? currentPrice;
  };

  const periods: PeriodReturn[] = [];
  let holdingQuantity = 0;
  let periodStart = sorted[0]?.date ?? new Date();
  let startValue = 0;

  for (let i = 0; i < sorted.length; i++) {
    const tx = sorted[i];
    if (!tx) continue;
    const endPrice = getPriceOn(tx.date);
    const endValue = holdingQuantity * endPrice;

    let cashFlow = 0;
    if (tx.type === "buy") {
      cashFlow = -(tx.quantity * tx.price + tx.fees);
      holdingQuantity += tx.quantity;
    } else if (tx.type === "sell") {
      cashFlow = tx.quantity * tx.price - tx.fees;
      holdingQuantity -= tx.quantity;
    } else if (tx.type === "dividend") {
      cashFlow = tx.quantity * tx.price;
    }

    if (i > 0) {
      const hprNumerator = endValue - startValue - cashFlow;
      const hprDenominator = startValue;
      const periodReturn =
        hprDenominator !== 0 ? hprNumerator / hprDenominator : 0;

      periods.push({
        periodStart,
        periodEnd: tx.date,
        startValue,
        endValue,
        cashFlows: cashFlow,
        return: endValue - startValue - cashFlow,
        returnPercent: periodReturn * 100,
      });
    }

    periodStart = tx.date;
    startValue = holdingQuantity * endPrice;
  }

  // Final period to current
  const lastEndValue = holdingQuantity * currentPrice;
  if (holdingQuantity > 0 && startValue > 0) {
    const finalReturn = (lastEndValue - startValue) / startValue;
    periods.push({
      periodStart,
      periodEnd: new Date(),
      startValue,
      endValue: lastEndValue,
      cashFlows: 0,
      return: lastEndValue - startValue,
      returnPercent: finalReturn * 100,
    });
  }

  return periods;
}
