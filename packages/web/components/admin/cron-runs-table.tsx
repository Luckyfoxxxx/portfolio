"use client";

import { useState } from "react";
import { CronRunDetailModal } from "./cron-run-detail-modal";

export interface SerializedCronRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: "success" | "partial" | "failed";
  symbolsAttempted: number;
  symbolsRefreshed: number;
  error: string | null;
  log: string | null;
}

interface CronRunsTableProps {
  runs: SerializedCronRun[];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function durationSeconds(startedIso: string, finishedIso: string | null): string {
  if (!finishedIso) return "—";
  const diff = new Date(finishedIso).getTime() - new Date(startedIso).getTime();
  return (diff / 1000).toFixed(1) + "s";
}

function StatusBadge({ status }: { status: "success" | "partial" | "failed" }) {
  const classes = {
    success: "bg-green-900 text-green-300",
    partial: "bg-yellow-900 text-yellow-300",
    failed: "bg-red-900 text-red-300",
  }[status];
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${classes}`}>
      {status}
    </span>
  );
}

export function CronRunsTable({ runs }: CronRunsTableProps) {
  const [selectedRun, setSelectedRun] = useState<SerializedCronRun | null>(null);

  if (runs.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-gray-400">No cron runs recorded.</p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-6 py-3 font-medium">Started At</th>
              <th className="px-6 py-3 font-medium">Duration</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Symbols</th>
              <th className="px-6 py-3 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr
                key={run.id}
                onClick={() => setSelectedRun(run)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedRun(run);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View details for cron run started at ${formatDate(run.startedAt)}`}
                className="cursor-pointer border-b border-gray-800 last:border-0 transition-colors hover:bg-gray-800/50 focus:bg-gray-800/50 focus:outline-none focus:ring-inset focus:ring-2 focus:ring-gray-500"
              >
                <td className="px-6 py-3 text-gray-300">{formatDate(run.startedAt)}</td>
                <td className="px-6 py-3 text-gray-300">
                  {durationSeconds(run.startedAt, run.finishedAt)}
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-6 py-3 text-gray-300">
                  {run.symbolsRefreshed}/{run.symbolsAttempted}
                </td>
                <td className="px-6 py-3 text-gray-400">
                  {run.error
                    ? run.error.slice(0, 60) + (run.error.length > 60 ? "…" : "")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRun && (
        <CronRunDetailModal
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </>
  );
}
