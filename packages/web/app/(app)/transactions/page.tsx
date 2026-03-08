import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getSession } from "../../../lib/auth/session";
import { db } from "../../../lib/db/index";
import { holdings, transactions } from "@portfolio/db";
import { AddTransactionForm } from "../../../components/transactions/add-transaction-form";
import { TransactionList } from "../../../components/transactions/transaction-list";

export const dynamic = "force-dynamic";

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
          <TransactionList transactions={allTransactions.map(({ tx }) => tx)} />
        </div>
      )}
    </div>
  );
}
