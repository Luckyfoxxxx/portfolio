export interface TransactionRecord {
  date: Date;
  type: "buy" | "sell" | "dividend";
  quantity: number;
  price: number;
  fees: number;
  currency: string;
}

export interface HoldingSnapshot {
  symbol: string;
  quantity: number;
  avgCostBasis: number;
  currency: string;
  currentPrice: number;
}

export interface PnLResult {
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalCost: number;
  currentValue: number;
}

export interface ReturnResult {
  totalReturn: number;
  totalReturnPercent: number;
  timeWeightedReturn: number;
}

export interface CostBasisLot {
  date: Date;
  quantity: number;
  costPerShare: number;
  fees: number;
}

export interface CostBasisResult {
  lots: CostBasisLot[];
  totalQuantity: number;
  averageCostPerShare: number;
  totalCost: number;
}
