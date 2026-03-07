import type { HistoricalBar, PriceQuote, PriceService } from "../types";

interface FinnhubQuoteResponse {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // previous close
  t: number; // timestamp
}

export class FinnhubAdapter implements PriceService {
  private readonly baseUrl = "https://finnhub.io/api/v1";
  private readonly source = "finnhub";

  constructor(private readonly apiKey: string) {}

  async getQuote(symbol: string): Promise<PriceQuote> {
    const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(symbol)}&token=${this.apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Finnhub API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as FinnhubQuoteResponse;

    if (!data.c) {
      throw new Error(`No price data for symbol: ${symbol}`);
    }

    return {
      symbol,
      price: data.c,
      currency: "USD",
      timestamp: new Date(data.t * 1000),
      source: this.source,
      change: data.d,
      changePercent: data.dp,
      open: data.o,
      high: data.h,
      low: data.l,
    };
  }

  async getQuotes(symbols: string[]): Promise<PriceQuote[]> {
    const results = await Promise.allSettled(
      symbols.map((s) => this.getQuote(s))
    );
    return results
      .filter(
        (r): r is PromiseFulfilledResult<PriceQuote> => r.status === "fulfilled"
      )
      .map((r) => r.value);
  }

  async getHistory(
    _symbol: string,
    _from: Date,
    _to: Date,
    _interval?: "1d" | "1wk" | "1mo"
  ): Promise<HistoricalBar[]> {
    // Finnhub candle endpoint requires premium plan for some exchanges
    // Use yahoo-finance2 for history
    throw new Error("Use YahooFinanceAdapter for historical data");
  }
}
