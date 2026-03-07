import type { HoldingSnapshot, PnLResult, TransactionRecord } from "../types/index";
import { calculateCostBasisFIFO } from "./cost-basis";

/**
 * Calculates unrealized and realized P&L for a position.
 */
export function calculatePnL(
  snapshot: HoldingSnapshot,
  transactions: TransactionRecord[]
): PnLResult {
  const costBasis = calculateCostBasisFIFO(transactions);

  const currentValue = snapshot.quantity * snapshot.currentPrice;
  const totalCost = costBasis.totalCost;

  const unrealizedPnL = currentValue - totalCost;
  const unrealizedPnLPercent =
    totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

  // Realized P&L: sum of (sell price - cost basis) for all sold shares
  const realizedPnL = calculateRealizedPnL(transactions);

  return {
    unrealizedPnL,
    unrealizedPnLPercent,
    realizedPnL,
    totalCost,
    currentValue,
  };
}

/**
 * Calculates realized P&L from completed buy/sell pairs using FIFO.
 */
export function calculateRealizedPnL(transactions: TransactionRecord[]): number {
  const sorted = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const lots: Array<{ quantity: number; costPerShare: number }> = [];
  let realizedPnL = 0;

  for (const tx of sorted) {
    if (tx.type === "buy") {
      lots.push({
        quantity: tx.quantity,
        costPerShare: tx.price + tx.fees / tx.quantity,
      });
    } else if (tx.type === "sell") {
      let remainingSellQty = tx.quantity;
      const sellProceeds = tx.price * tx.quantity - tx.fees;
      const costToAllocate = sellProceeds;
      let costBasisForSell = 0;

      const tempLots = [...lots];
      let i = 0;
      while (remainingSellQty > 0 && i < tempLots.length) {
        const lot = tempLots[i];
        if (!lot) break;
        if (lot.quantity <= remainingSellQty) {
          costBasisForSell += lot.quantity * lot.costPerShare;
          remainingSellQty -= lot.quantity;
          i++;
        } else {
          costBasisForSell += remainingSellQty * lot.costPerShare;
          remainingSellQty = 0;
        }
      }

      realizedPnL += costToAllocate - costBasisForSell;

      // Remove consumed lots from the actual list
      let sellQty = tx.quantity;
      while (sellQty > 0 && lots.length > 0) {
        const lot = lots[0];
        if (!lot) break;
        if (lot.quantity <= sellQty) {
          sellQty -= lot.quantity;
          lots.shift();
        } else {
          lot.quantity -= sellQty;
          sellQty = 0;
        }
      }
    } else if (tx.type === "dividend") {
      realizedPnL += tx.price * tx.quantity;
    }
  }

  return realizedPnL;
}

/**
 * Calculates total P&L across multiple holdings.
 */
export function calculatePortfolioPnL(
  holdings: Array<{ snapshot: HoldingSnapshot; transactions: TransactionRecord[] }>
): PnLResult {
  let totalUnrealizedPnL = 0;
  let totalRealizedPnL = 0;
  let totalCost = 0;
  let totalCurrentValue = 0;

  for (const { snapshot, transactions } of holdings) {
    const pnl = calculatePnL(snapshot, transactions);
    totalUnrealizedPnL += pnl.unrealizedPnL;
    totalRealizedPnL += pnl.realizedPnL;
    totalCost += pnl.totalCost;
    totalCurrentValue += pnl.currentValue;
  }

  const unrealizedPnLPercent =
    totalCost > 0 ? (totalUnrealizedPnL / totalCost) * 100 : 0;

  return {
    unrealizedPnL: totalUnrealizedPnL,
    unrealizedPnLPercent,
    realizedPnL: totalRealizedPnL,
    totalCost,
    currentValue: totalCurrentValue,
  };
}
