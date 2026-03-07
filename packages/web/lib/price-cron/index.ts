import { YahooFinanceAdapter, type NewsArticle } from "@portfolio/api-adapters";
import { priceSnapshots, newsItems, holdings } from "@portfolio/db";
import { db } from "../db/index";

const adapter = new YahooFinanceAdapter();

// Refresh interval: 5 minutes during market hours
const INTERVAL_MS = 5 * 60 * 1000;

// Market hours: roughly 9:30–16:00 ET, Mon–Fri
// We use UTC: ET = UTC-5 (EST) or UTC-4 (EDT)
function isMarketHours(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 14:30–21:00 UTC covers US market hours (accounting for DST roughly)
  return totalMinutes >= 14 * 60 + 30 && totalMinutes <= 21 * 60;
}

async function refreshPrices() {
  const allHoldings = await db.select().from(holdings);
  if (allHoldings.length === 0) return;

  const symbols = [...new Set(allHoldings.map((h) => h.symbol))];

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

  console.log(`[price-cron] Refreshed ${quotes.length}/${symbols.length} symbols`);
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
