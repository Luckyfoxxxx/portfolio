"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../lib/trpc/client";
import type { Holding } from "@portfolio/db";

interface EditHoldingModalProps {
  holding: Holding;
  onClose: () => void;
}

export function EditHoldingModal({ holding, onClose }: EditHoldingModalProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState(holding.symbol);
  const [name, setName] = useState(holding.name);
  const [quantity, setQuantity] = useState(String(holding.quantity));
  const [avgCostBasis, setAvgCostBasis] = useState(String(holding.avgCostBasis));
  const [currency, setCurrency] = useState(holding.currency);
  const [exchange, setExchange] = useState(holding.exchange ?? "");

  const updateHolding = trpc.holdings.update.useMutation({
    onSuccess: () => {
      utils.holdings.list.invalidate();
      utils.holdings.get.invalidate({ id: holding.id });
      router.refresh();
      onClose();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedQty = parseFloat(quantity);
    const parsedCost = parseFloat(avgCostBasis);

    if (isNaN(parsedQty) || parsedQty < 0) {
      setError("Quantity must be zero or positive.");
      return;
    }
    if (isNaN(parsedCost) || parsedCost < 0) {
      setError("Avg cost basis must be zero or positive.");
      return;
    }
    if (currency.length !== 3) {
      setError("Currency must be a 3-letter code.");
      return;
    }

    updateHolding.mutate({
      id: holding.id,
      symbol: symbol.trim().toUpperCase(),
      name: name.trim(),
      quantity: parsedQty,
      avgCostBasis: parsedCost,
      currency: currency.trim().toUpperCase(),
      exchange: exchange.trim(),
    });
  }

  const inputClass =
    "rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-gray-500 w-full";
  const labelClass = "text-xs text-gray-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-holding-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 id="edit-holding-title" className="text-sm font-medium">
            Edit Holding
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
                maxLength={20}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
                maxLength={3}
                placeholder="USD"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="0"
                step="any"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Avg cost basis</label>
              <input
                type="number"
                value={avgCostBasis}
                onChange={(e) => setAvgCostBasis(e.target.value)}
                required
                min="0"
                step="any"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Exchange (optional)</label>
            <input
              type="text"
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              maxLength={20}
              placeholder=""
              className={inputClass}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateHolding.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-950 transition-opacity disabled:opacity-50"
            >
              {updateHolding.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
