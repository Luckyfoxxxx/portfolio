import { notFound } from "next/navigation";
import { getSession } from "../../../lib/auth/session";
import { db } from "../../../lib/db/index";
import { cronRuns } from "@portfolio/db";
import { desc } from "drizzle-orm";
import { isMarketHours } from "../../../lib/price-cron/index";
import { CronRunsTable } from "../../../components/admin/cron-runs-table";
import type { SerializedCronRun } from "../../../components/admin/cron-runs-table";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function durationSeconds(started: Date, finished: Date | null): string {
  if (!finished) return "—";
  return ((finished.getTime() - started.getTime()) / 1000).toFixed(1) + "s";
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

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.isAdmin) notFound();

  const runs = await db.select().from(cronRuns).orderBy(desc(cronRuns.startedAt)).limit(20);

  const lastRun = runs[0] ?? null;
  const FIFTEEN_MIN_MS = 15 * 60 * 1000;
  const isStale =
    lastRun !== null &&
    isMarketHours() &&
    lastRun.startedAt.getTime() < Date.now() - FIFTEEN_MIN_MS;

  const showAlert =
    lastRun === null || lastRun.status === "failed" || isStale;

  const alertMessage =
    lastRun === null
      ? "Cron has never run. Check that instrumentation.ts is registered and the server has restarted."
      : lastRun.status === "failed"
      ? `Last cron run failed: ${lastRun.error ?? "unknown error"}`
      : "Last cron run is stale (>15 min old during market hours). The cron may have stopped.";

  const serializedRuns: SerializedCronRun[] = runs.map((run) => ({
    id: run.id,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    status: run.status,
    symbolsAttempted: run.symbolsAttempted,
    symbolsRefreshed: run.symbolsRefreshed,
    error: run.error ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold">Admin — Price Cron Monitor</h1>

      {showAlert && (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            lastRun?.status === "failed" || lastRun === null
              ? "border-red-700 bg-red-950 text-red-300"
              : "border-yellow-700 bg-yellow-950 text-yellow-300"
          }`}
        >
          {alertMessage}
        </div>
      )}

      {/* Status card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Last Run
        </h2>
        {lastRun === null ? (
          <p className="text-gray-400">No runs recorded yet.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-gray-500">Started At</dt>
              <dd className="mt-1 text-sm text-white">{formatDate(lastRun.startedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={lastRun.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Symbols Refreshed</dt>
              <dd className="mt-1 text-sm text-white">
                {lastRun.symbolsRefreshed}/{lastRun.symbolsAttempted}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Duration</dt>
              <dd className="mt-1 text-sm text-white">
                {durationSeconds(lastRun.startedAt, lastRun.finishedAt)}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Runs table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Recent Runs (last 20)
          </h2>
          <p className="mt-1 text-xs text-gray-500">Click a row to view full details.</p>
        </div>
        <CronRunsTable runs={serializedRuns} />
      </div>
    </div>
  );
}
