import { redirect } from "next/navigation";
import { getSession } from "../../../lib/auth/session";
import { db } from "../../../lib/db/index";
import { HoldingsList } from "../../../components/holdings/holdings-list";
import { PortfolioSummary } from "../../../components/holdings/portfolio-summary";
import { holdings, priceSnapshots, transactions } from "@portfolio/db";
import { calculatePortfolioPnL } from "@portfolio/core/calculations";
import { desc, eq, inArray } from "drizzle-orm";
import type { TransactionRecord } from "@portfolio/core/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const allHoldings = await db.select().from(holdings);

  if (allHoldings.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-xl font-semibold">Dashboard</h1>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-400">No holdings yet.</p>
          <p className="mt-1 text-sm text-gray-600">
            Add your first holding to get started.
          </p>
        </div>
      </div>
    );
  }

  const symbols = allHoldings.map((h) => h.symbol);

  // Get latest price for each symbol
  const latestPrices = await Promise.all(
    symbols.map(async (symbol) => {
      const rows = await db
        .select()
        .from(priceSnapshots)
        .where(eq(priceSnapshots.symbol, symbol))
        .orderBy(desc(priceSnapshots.timestamp))
        .limit(1);
      return { symbol, price: rows[0]?.price ?? null };
    })
  );

  const priceMap = new Map(latestPrices.map((p) => [p.symbol, p.price]));

  // Get all transactions
  const holdingIds = allHoldings.map((h) => h.id);
  const allTransactions = holdingIds.length > 0
    ? await db.select().from(transactions).where(inArray(transactions.holdingId, holdingIds))
    : [];

  const txByHolding = new Map<number, typeof allTransactions>();
  for (const tx of allTransactions) {
    const arr = txByHolding.get(tx.holdingId) ?? [];
    arr.push(tx);
    txByHolding.set(tx.holdingId, arr);
  }

  const holdingsWithData = allHoldings.map((holding) => {
    const currentPrice = priceMap.get(holding.symbol) ?? holding.avgCostBasis;
    const txs = txByHolding.get(holding.id) ?? [];
    const txRecords: TransactionRecord[] = txs.map((tx) => ({
      date: tx.date,
      type: tx.type,
      quantity: tx.quantity,
      price: tx.price,
      fees: tx.fees,
      currency: tx.currency,
    }));
    return { holding, currentPrice, txRecords };
  });

  const portfolioPnL = calculatePortfolioPnL(
    holdingsWithData.map(({ holding, currentPrice, txRecords }) => ({
      snapshot: {
        symbol: holding.symbol,
        quantity: holding.quantity,
        avgCostBasis: holding.avgCostBasis,
        currency: holding.currency,
        currentPrice,
      },
      transactions: txRecords,
    }))
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <PortfolioSummary pnl={portfolioPnL} />
      <HoldingsList holdings={holdingsWithData} />
    </div>
  );
}
