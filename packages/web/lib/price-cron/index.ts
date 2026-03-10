import { YahooFinanceAdapter, type NewsArticle } from "@portfolio/api-adapters";
import { priceSnapshots, newsItems, holdings, cronRuns } from "@portfolio/db";
import { eq } from "drizzle-orm";
import { db } from "../db/index";

const adapter = new YahooFinanceAdapter();

// Refresh interval: 5 minutes during market hours
const INTERVAL_MS = 5 * 60 * 1000;

// Market hours: Oslo Børs (CET UTC+1 / CEST UTC+2)
// 09:00 CET = 08:00 UTC, 17:30 CET = 16:30 UTC
export function isMarketHours(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 08:00–16:30 UTC covers Oslo Børs hours (CET UTC+1 and CEST UTC+2)
  return totalMinutes >= 8 * 60 && totalMinutes <= 16 * 60 + 30;
}

async function refreshPrices() {
  const allHoldings = await db.select().from(holdings);
  if (allHoldings.length === 0) return;

  const symbols = [...new Set(allHoldings.map((h) => h.symbol))];
  const startedAt = new Date();

  // Insert cron run row pessimistically (status: "failed")
  const [run] = await db
    .insert(cronRuns)
    .values({
      startedAt,
      status: "failed",
      symbolsAttempted: symbols.length,
      symbolsRefreshed: 0,
    })
    .returning();

  const runId = run!.id;

  try {
    const quotes = await adapter.getQuotes(symbols);
    const now = new Date();

    for (const quote of quotes) {
      await db.insert(priceSnapshots).values({
        symbol: quote.symbol,
        price: quote.price,
        currency: quote.currency,
        source: quote.source,
        timestamp: now,
      });
    }

    // Refresh news for each symbol (less frequently — once per cycle)
    for (const symbol of symbols) {
      try {
        const articles = (await adapter.getNews?.(symbol, 5) ?? [])
          .filter((a: NewsArticle) => a.url.startsWith("https://") || a.url.startsWith("http://"));
        for (const article of articles) {
          await db
            .insert(newsItems)
            .values({
              symbol,
              headline: article.headline,
              url: article.url,
              source: article.source ?? null,
              publishedAt: article.publishedAt,
            })
            .onConflictDoNothing();
        }
      } catch {
        // News is best-effort
      }
    }

    const symbolsRefreshed = quotes.length;
    const status = symbolsRefreshed === symbols.length ? "success" : "partial";

    await db
      .update(cronRuns)
      .set({ finishedAt: new Date(), status, symbolsRefreshed })
      .where(eq(cronRuns.id, runId));

    console.log(`[price-cron] Refreshed ${symbolsRefreshed}/${symbols.length} symbols`);
  } catch (err) {
    await db
      .update(cronRuns)
      .set({
        finishedAt: new Date(),
        status: "failed",
        symbolsRefreshed: 0,
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(cronRuns.id, runId));

    throw err;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startPriceCron() {
  if (timer) return;

  timer = setInterval(() => {
    if (isMarketHours()) {
      refreshPrices().catch((err) =>
        console.error("[price-cron] Error:", err)
      );
    }
  }, INTERVAL_MS);

  // Run immediately on start regardless of market hours
  refreshPrices().catch((err) => console.error("[price-cron] Initial refresh error:", err));

  console.log("[price-cron] Started");
}

export function stopPriceCron() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
