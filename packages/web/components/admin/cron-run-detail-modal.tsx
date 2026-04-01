"use client";

import { useEffect, useRef } from "react";

interface LogEntry {
  level: "info" | "ok" | "warn" | "error";
  msg: string;
  symbol?: string;
  price?: number;
  currency?: string;
  source?: string;
}

interface CronRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: "success" | "partial" | "failed";
  symbolsAttempted: number;
  symbolsRefreshed: number;
  error: string | null;
  log: string | null;
}

interface CronRunDetailModalProps {
  run: CronRun;
  onClose: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
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

function parseLog(raw: string | null): LogEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LogEntry[]) : [];
  } catch {
    return [];
  }
}

const logLevelStyle: Record<string, string> = {
  ok: "text-green-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  info: "text-gray-400",
};

const logLevelPrefix: Record<string, string> = {
  ok: "✓",
  warn: "⚠",
  error: "✗",
  info: "·",
};

export function CronRunDetailModal({ run, onClose }: CronRunDetailModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const logEntries = parseLog(run.log);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cron-run-detail-title"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 id="cron-run-detail-title" className="text-sm font-medium">
            Cron Run #{run.id}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded p-2.5 text-gray-500 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <dl className="divide-y divide-gray-800 px-4">
          <div className="flex items-start justify-between py-3">
            <dt className="text-xs text-gray-500">Status</dt>
            <dd className="ml-4">
              <StatusBadge status={run.status} />
            </dd>
          </div>

          <div className="flex items-start justify-between py-3">
            <dt className="text-xs text-gray-500">Started At</dt>
            <dd className="ml-4 text-sm text-gray-200">{formatDate(run.startedAt)}</dd>
          </div>

          <div className="flex items-start justify-between py-3">
            <dt className="text-xs text-gray-500">Finished At</dt>
            <dd className="ml-4 text-sm text-gray-200">{formatDate(run.finishedAt)}</dd>
          </div>

          <div className="flex items-start justify-between py-3">
            <dt className="text-xs text-gray-500">Duration</dt>
            <dd className="ml-4 text-sm text-gray-200">
              {durationSeconds(run.startedAt, run.finishedAt)}
            </dd>
          </div>

          <div className="flex items-start justify-between py-3">
            <dt className="text-xs text-gray-500">Symbols Refreshed</dt>
            <dd className="ml-4 text-sm text-gray-200">
              {run.symbolsRefreshed} / {run.symbolsAttempted}
            </dd>
          </div>

          {run.error && (
            <div className="py-3">
              <dt className="mb-2 text-xs text-gray-500">Error</dt>
              <dd className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300 break-words whitespace-pre-wrap">
                {run.error}
              </dd>
            </div>
          )}

          <div className="py-3">
            <dt className="mb-2 text-xs text-gray-500">Log</dt>
            <dd>
              {logEntries.length > 0 ? (
                <ul className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 space-y-0.5 font-mono text-xs max-h-96 overflow-y-auto">
                  {logEntries.map((entry, i) => (
                    <li key={i} className={`flex gap-2 ${logLevelStyle[entry.level] ?? "text-gray-400"}`}>
                      <span className="shrink-0 w-4 text-center">{logLevelPrefix[entry.level] ?? "·"}</span>
                      <span className="break-words">
                        {entry.symbol ? <span className="font-semibold">{entry.symbol}: </span> : null}
                        {entry.msg}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">No log data for this run.</p>
              )}
            </dd>
          </div>
        </dl>

        <div className="border-t border-gray-800 px-4 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
