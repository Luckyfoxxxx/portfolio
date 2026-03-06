import type { PnLResult } from "@portfolio/core/types";

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

interface PortfolioSummaryProps {
  pnl: PnLResult;
}

export function PortfolioSummary({ pnl }: PortfolioSummaryProps) {
  const isUp = pnl.unrealizedPnL >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Portfolio Value" value={formatCurrency(pnl.currentValue)} />
      <StatCard label="Total Cost" value={formatCurrency(pnl.totalCost)} />
      <StatCard
        label="Unrealized P&L"
        value={formatCurrency(pnl.unrealizedPnL)}
        sub={formatPercent(pnl.unrealizedPnLPercent)}
        positive={isUp}
      />
      <StatCard
        label="Realized P&L"
        value={formatCurrency(pnl.realizedPnL)}
        positive={pnl.realizedPnL >= 0}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          positive === undefined
            ? "text-white"
            : positive
            ? "text-emerald-400"
            : "text-red-400"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-xs tabular-nums ${
            positive ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
