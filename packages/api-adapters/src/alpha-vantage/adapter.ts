import type { HistoricalBar, PriceQuote, PriceService } from "../types.js";

interface AlphaVantageTimeSeriesEntry {
  "1. open": string;
  "2. high": string;
  "3. low": string;
  "4. close": string;
  "5. adjusted close"?: string;
  "6. volume": string;
}

interface AlphaVantageTimeSeriesResponse {
  "Meta Data": {
    "2. Symbol": string;
    "3. Last Refreshed": string;
  };
  "Time Series (Daily)": Record<string, AlphaVantageTimeSeriesEntry>;
}

interface AlphaVantageGlobalQuote {
  "Global Quote": {
    "01. symbol": string;
    "05. price": string;
    "09. change": string;
    "10. change percent": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "06. volume": string;
    "07. latest trading day": string;
  };
}

export class AlphaVantageAdapter implements PriceService {
  private readonly baseUrl = "https://www.alphavantage.co/query";
  private readonly source = "alpha-vantage";

  constructor(private readonly apiKey: string) {}

  async getQuote(symbol: string): Promise<PriceQuote> {
    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Alpha Vantage API error: ${res.status}`);
    }

    const data = (await res.json()) as AlphaVantageGlobalQuote;
    const quote = data["Global Quote"];

    if (!quote?.["05. price"]) {
      throw new Error(`No price data for symbol: ${symbol}`);
    }

    const changePercentStr = quote["10. change percent"].replace("%", "");

    return {
      symbol: quote["01. symbol"],
      price: parseFloat(quote["05. price"]),
      currency: "USD",
      timestamp: new Date(quote["07. latest trading day"]),
      source: this.source,
      change: parseFloat(quote["09. change"]),
      changePercent: parseFloat(changePercentStr),
      open: parseFloat(quote["02. open"]),
      high: parseFloat(quote["03. high"]),
      low: parseFloat(quote["04. low"]),
      volume: parseInt(quote["06. volume"], 10),
    };
  }

  async getQuotes(symbols: string[]): Promise<PriceQuote[]> {
    // Alpha Vantage free tier: 25 requests/day — call sparingly
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
    symbol: string,
    from: Date,
    to: Date,
    _interval?: "1d" | "1wk" | "1mo"
  ): Promise<HistoricalBar[]> {
    const url = `${this.baseUrl}?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${this.apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Alpha Vantage API error: ${res.status}`);
    }

    const data = (await res.json()) as AlphaVantageTimeSeriesResponse;
    const timeSeries = data["Time Series (Daily)"];

    if (!timeSeries) {
      throw new Error(`No historical data for symbol: ${symbol}`);
    }

    return Object.entries(timeSeries)
      .map(([dateStr, bar]) => ({
        date: new Date(dateStr),
        open: parseFloat(bar["1. open"]),
        high: parseFloat(bar["2. high"]),
        low: parseFloat(bar["3. low"]),
        close: parseFloat(bar["4. close"]),
        volume: parseInt(bar["6. volume"], 10),
        adjClose: bar["5. adjusted close"]
          ? parseFloat(bar["5. adjusted close"])
          : undefined,
      }))
      .filter((bar) => bar.date >= from && bar.date <= to)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
