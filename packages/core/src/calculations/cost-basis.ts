import type { CostBasisLot, CostBasisResult, TransactionRecord } from "../types/index";

/**
 * Calculates cost basis using FIFO (First In, First Out) method.
 * Returns remaining lots after accounting for sells, and average cost.
 */
export function calculateCostBasisFIFO(
  transactions: TransactionRecord[]
): CostBasisResult {
  const sorted = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const lots: CostBasisLot[] = [];

  for (const tx of sorted) {
    if (tx.type === "buy") {
      lots.push({
        date: tx.date,
        quantity: tx.quantity,
        costPerShare: tx.price + tx.fees / tx.quantity,
        fees: tx.fees,
      });
    } else if (tx.type === "sell") {
      let remainingSellQty = tx.quantity;
      while (remainingSellQty > 0 && lots.length > 0) {
        const lot = lots[0];
        if (!lot) break;
        if (lot.quantity <= remainingSellQty) {
          remainingSellQty -= lot.quantity;
          lots.shift();
        } else {
          lot.quantity -= remainingSellQty;
          remainingSellQty = 0;
        }
      }
    }
    // dividends don't affect cost basis
  }

  const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);
  const totalCost = lots.reduce(
    (sum, lot) => sum + lot.quantity * lot.costPerShare,
    0
  );
  const averageCostPerShare = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  return {
    lots,
    totalQuantity,
    averageCostPerShare,
    totalCost,
  };
}

/**
 * Calculates cost basis using average cost method.
 */
export function calculateCostBasisAverage(
  transactions: TransactionRecord[]
): CostBasisResult {
  const sorted = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  let totalQuantity = 0;
  let totalCost = 0;

  for (const tx of sorted) {
    if (tx.type === "buy") {
      const costIncludingFees = tx.quantity * tx.price + tx.fees;
      totalQuantity += tx.quantity;
      totalCost += costIncludingFees;
    } else if (tx.type === "sell") {
      const avgCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
      totalCost -= tx.quantity * avgCost;
      totalQuantity -= tx.quantity;
      if (totalQuantity < 0) totalQuantity = 0;
      if (totalCost < 0) totalCost = 0;
    }
  }

  const averageCostPerShare = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  const lot: CostBasisLot = {
    date: new Date(),
    quantity: totalQuantity,
    costPerShare: averageCostPerShare,
    fees: 0,
  };

  return {
    lots: totalQuantity > 0 ? [lot] : [],
    totalQuantity,
    averageCostPerShare,
    totalCost,
  };
}
