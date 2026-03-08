"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc/client";

interface HoldingOption {
  id: number;
  symbol: string;
  name: string;
}

interface AddTransactionFormProps {
  holdings: HoldingOption[];
}

const TRANSACTION_TYPES = ["buy", "sell", "dividend"] as const;
type TxType = (typeof TRANSACTION_TYPES)[number];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddTransactionForm({ holdings }: AddTransactionFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (open) {
      // Defer one tick so the form is rendered before we focus
      const id = setTimeout(() => firstFieldRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [open]);

  const [holdingId, setHoldingId] = useState<string>(
    holdings[0] ? String(holdings[0].id) : ""
  );
  const [type, setType] = useState<TxType>("buy");
  const [date, setDate] = useState(today());
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("");
  const [notes, setNotes] = useState("");

  const addTransaction = trpc.holdings.addTransaction.useMutation({
    onSuccess: () => {
      setOpen(false);
      setQuantity("");
      setPrice("");
      setFees("");
      setNotes("");
      setDate(today());
      setError(null);
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-500">
        Add a holding before recording transactions.
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedQty = parseFloat(quantity);
    const parsedPrice = parseFloat(price);
    const parsedFees = fees ? parseFloat(fees) : 0;
    const parsedId = parseInt(holdingId, 10);

    if (!holdingId || isNaN(parsedId)) {
      setError("Select a holding.");
      return;
    }
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Price must be a positive number.");
      return;
    }
    if (isNaN(parsedFees) || parsedFees < 0) {
      setError("Fees must be zero or positive.");
      return;
    }

    addTransaction.mutate({
      holdingId: parsedId,
      type,
      date,
      quantity: parsedQty,
      price: parsedPrice,
      fees: parsedFees,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-gray-800/50"
      >
        <span>Add Transaction</span>
        <span className="text-gray-500 text-lg leading-none">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-gray-800 px-4 py-4 space-y-4">
          {/* Holding + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="tx-holding" className="text-xs text-gray-400">Holding</label>
              <select
                ref={firstFieldRef}
                id="tx-holding"
                value={holdingId}
                onChange={(e) => setHoldingId(e.target.value)}
                required
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
              >
                {holdings.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.symbol} — {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="tx-type" className="text-xs text-gray-400">Type</label>
              <select
                id="tx-type"
                value={type}
                onChange={(e) => setType(e.target.value as TxType)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
              >
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Quantity + Price row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="tx-date" className="text-xs text-gray-400">Date</label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="tx-quantity" className="text-xs text-gray-400">Quantity</label>
              <input
                id="tx-quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="0"
                step="any"
                placeholder="0"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="tx-price" className="text-xs text-gray-400">Price per share</label>
              <input
                id="tx-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0"
                step="any"
                placeholder="0.00"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
              />
            </div>
          </div>

          {/* Fees + Notes row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="tx-fees" className="text-xs text-gray-400">Fees (optional)</label>
              <input
                id="tx-fees"
                type="number"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                min="0"
                step="any"
                placeholder="0.00"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="tx-notes" className="text-xs text-gray-400">Notes (optional)</label>
              <input
                id="tx-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder=""
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
              />
            </div>
          </div>

          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addTransaction.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-950 transition-opacity disabled:opacity-50"
            >
              {addTransaction.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
