import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getSession } from "../../../lib/auth/session";
import { db } from "../../../lib/db/index";
import { holdings, transactions } from "@portfolio/db";
import { AddTransactionForm } from "../../../components/transactions/add-transaction-form";

export const dynamic = "force-dynamic";

function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [allHoldings, allTransactions] = await Promise.all([
    db.select({ id: holdings.id, symbol: holdings.symbol, name: holdings.name }).from(holdings),
    db
      .select({ tx: transactions, holding: holdings })
      .from(transactions)
      .leftJoin(holdings, eq(transactions.holdingId, holdings.id))
      .orderBy(desc(transactions.date)),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Transactions</h1>

      <AddTransactionForm holdings={allHoldings} />

      {allTransactions.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-400">No transactions yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="divide-y divide-gray-800">
            {allTransactions.map(({ tx }) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium uppercase ${
                        tx.type === "buy"
                          ? "text-emerald-400"
                          : tx.type === "sell"
                          ? "text-red-400"
                          : "text-blue-400"
                      }`}
                    >
                      {tx.type}
                    </span>
                    <span className="font-medium">{tx.symbol}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {tx.quantity} shares @ {formatCurrency(tx.price, tx.currency)}
                  </p>
                </div>
                <div className="ml-4 text-right shrink-0">
                  <p className="text-sm font-medium tabular-nums">
                    {formatCurrency(tx.quantity * tx.price, tx.currency)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {tx.date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
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
