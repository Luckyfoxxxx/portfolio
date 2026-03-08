"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc/client";
import { formatCurrency } from "../../lib/format";

interface Transaction {
  id: number;
  type: string;
  symbol: string;
  quantity: number;
  price: number;
  currency: string;
  date: Date;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const deleteTransaction = trpc.holdings.deleteTransaction.useMutation({
    onSuccess: () => {
      setConfirmId(null);
      router.refresh();
    },
  });

  return (
    <div className="divide-y divide-gray-800">
      {transactions.map((tx) => (
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
          <div className="ml-4 flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-sm font-medium tabular-nums">
                {formatCurrency(tx.quantity * tx.price, tx.currency)}
                <span className="ml-1 text-xs font-normal text-gray-500">excl. fees</span>
              </p>
              <p className="text-xs text-gray-500">
                {tx.date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            {confirmId === tx.id ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">Delete?</span>
                <button
                  onClick={() => setConfirmId(null)}
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  No
                </button>
                <button
                  onClick={() => deleteTransaction.mutate({ id: tx.id })}
                  disabled={deleteTransaction.isPending}
                  className="text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                >
                  {deleteTransaction.isPending && deleteTransaction.variables?.id === tx.id
                    ? "…"
                    : "Yes"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmId(tx.id)}
                className="text-xs text-gray-600 transition-colors hover:text-red-400"
                aria-label={`Delete transaction`}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
