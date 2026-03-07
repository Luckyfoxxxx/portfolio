import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getSession } from "../../../../lib/auth/session";
import { db } from "../../../../lib/db/index";
import { holdings, newsItems, priceSnapshots, transactions } from "@portfolio/db";
import { calculatePnL } from "@portfolio/core/calculations";
import { PriceChart } from "../../../../components/charts/price-chart";
import { NewsFeed } from "../../../../components/holdings/news-feed";
import type { TransactionRecord } from "@portfolio/core/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ symbol: string }>;
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

export default async function HoldingPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { symbol } = await params;

  const holdingResults = await db
    .select()
    .from(holdings)
    .where(eq(holdings.symbol, symbol.toUpperCase()))
    .limit(1);

  const holding = holdingResults[0];
  if (!holding) notFound();

  const [txResults, priceHistory, latestPriceRows, news] = await Promise.all([
    db.select().from(transactions).where(eq(transactions.holdingId, holding.id)),
    db
      .select()
      .from(priceSnapshots)
      .where(eq(priceSnapshots.symbol, holding.symbol))
      .orderBy(priceSnapshots.timestamp)
      .limit(365),
    db
      .select()
      .from(priceSnapshots)
      .where(eq(priceSnapshots.symbol, holding.symbol))
      .orderBy(desc(priceSnapshots.timestamp))
      .limit(1),
    db
      .select()
      .from(newsItems)
      .where(eq(newsItems.symbol, holding.symbol))
      .orderBy(desc(newsItems.publishedAt))
      .limit(10),
  ]);

  const currentPrice = latestPriceRows[0]?.price ?? holding.avgCostBasis;

  const txRecords: TransactionRecord[] = txResults.map((tx) => ({
    date: tx.date,
    type: tx.type,
    quantity: tx.quantity,
    price: tx.price,
    fees: tx.fees,
    currency: tx.currency,
  }));

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

  const chartData = priceHistory.map((p) => ({
    date: p.timestamp.toISOString(),
    price: p.price,
  }));

  const isUp = pnl.unrealizedPnL >= 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{holding.symbol}</h1>
          <p className="text-sm text-gray-400">{holding.name}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(currentPrice, holding.currency)}
          </p>
          <p className={`text-sm tabular-nums ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            {formatPercent(pnl.unrealizedPnLPercent)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Quantity", value: holding.quantity.toString() },
          { label: "Avg Cost", value: formatCurrency(holding.avgCostBasis, holding.currency) },
          { label: "Market Value", value: formatCurrency(pnl.currentValue, holding.currency) },
          {
            label: "Unrealized P&L",
            value: formatCurrency(pnl.unrealizedPnL, holding.currency),
            positive: isUp,
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${
              stat.positive === undefined ? "text-white" : stat.positive ? "text-emerald-400" : "text-red-400"
            }`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-4 text-sm font-medium">Price History</h2>
          <PriceChart data={chartData} currency={holding.currency} />
        </div>
      )}

      {/* News */}
      {news.length > 0 && <NewsFeed news={news} />}

      {/* Transactions */}
      {txResults.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="border-b border-gray-800 px-4 py-3">
            <h2 className="text-sm font-medium">Transactions</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {txResults.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <span className={`text-xs font-medium uppercase ${
                    tx.type === "buy" ? "text-emerald-400" : tx.type === "sell" ? "text-red-400" : "text-blue-400"
                  }`}>
                    {tx.type}
                  </span>
                  <p className="text-sm">{tx.quantity} shares @ {formatCurrency(tx.price, tx.currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm tabular-nums">
                    {formatCurrency(tx.quantity * tx.price, tx.currency)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {tx.date.toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
