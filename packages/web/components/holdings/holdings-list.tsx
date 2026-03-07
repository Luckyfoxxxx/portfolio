import Link from "next/link";
import { calculatePnL } from "@portfolio/core/calculations";
import type { Holding } from "@portfolio/db";
import type { TransactionRecord } from "@portfolio/core/types";

interface HoldingRowData {
  holding: Holding;
  currentPrice: number;
  txRecords: TransactionRecord[];
}

interface HoldingsListProps {
  holdings: HoldingRowData[];
}

function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPercent(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function HoldingsList({ holdings }: HoldingsListProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-medium">Holdings</h2>
      </div>
      <div className="divide-y divide-gray-800">
        {holdings.map(({ holding, currentPrice, txRecords }) => {
          const pnl = calculatePnL(
            {
              symbol: holding.symbol,
              quantity: holding.quantity,
              avgCostBasis: holding.avgCostBasis,
              currency: holding.currency,
              currentPrice,
            },
            txRecords
          );
          const isUp = pnl.unrealizedPnL >= 0;

          return (
            <Link
              key={holding.id}
              href={`/holdings/${holding.symbol}`}
              className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-gray-800/50"
            >
              <div className="min-w-0">
                <p className="font-medium">{holding.symbol}</p>
                <p className="text-xs text-gray-500 truncate">{holding.name}</p>
                <p className="text-xs text-gray-600">{holding.quantity} sh</p>
              </div>
              <div className="ml-4 text-right shrink-0">
                <p className="font-medium tabular-nums">
                  {formatCurrency(pnl.currentValue, holding.currency)}
                </p>
                <p
                  className={`text-xs tabular-nums ${
                    isUp ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatCurrency(pnl.unrealizedPnL, holding.currency)}{" "}
                  ({formatPercent(pnl.unrealizedPnLPercent)})
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
