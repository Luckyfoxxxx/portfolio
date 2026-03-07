import YahooFinance from "yahoo-finance2";
import type {
  HistoricalBar,
  NewsArticle,
  PriceQuote,
  PriceService,
} from "../types";

const yf = new YahooFinance();

export class YahooFinanceAdapter implements PriceService {
  private readonly source = "yahoo-finance";

  async getQuote(symbol: string): Promise<PriceQuote> {
    const result = await yf.quote(symbol);

    if (!result.regularMarketPrice) {
      throw new Error(`No price data for symbol: ${symbol}`);
    }

    return {
      symbol: result.symbol ?? symbol,
      price: result.regularMarketPrice,
      currency: result.currency ?? "USD",
      timestamp: result.regularMarketTime
        ? new Date(result.regularMarketTime)
        : new Date(),
      source: this.source,
      ...(result.regularMarketChange !== undefined ? { change: result.regularMarketChange } : {}),
      ...(result.regularMarketChangePercent !== undefined ? { changePercent: result.regularMarketChangePercent } : {}),
      ...(result.regularMarketOpen !== undefined ? { open: result.regularMarketOpen } : {}),
      ...(result.regularMarketDayHigh !== undefined ? { high: result.regularMarketDayHigh } : {}),
      ...(result.regularMarketDayLow !== undefined ? { low: result.regularMarketDayLow } : {}),
      ...(result.regularMarketVolume !== undefined ? { volume: result.regularMarketVolume } : {}),
      ...(result.marketCap !== undefined ? { marketCap: result.marketCap } : {}),
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
    symbol: string,
    from: Date,
    to: Date,
    interval: "1d" | "1wk" | "1mo" = "1d"
  ): Promise<HistoricalBar[]> {
    const result = await yf.historical(symbol, {
      period1: from,
      period2: to,
      interval,
    });

    return result.map((bar) => ({
      date: bar.date,
      open: bar.open ?? 0,
      high: bar.high ?? 0,
      low: bar.low ?? 0,
      close: bar.close ?? 0,
      volume: bar.volume ?? 0,
      ...(bar.adjClose !== undefined ? { adjClose: bar.adjClose } : {}),
    }));
  }

  async getNews(symbol: string, limit = 10): Promise<NewsArticle[]> {
    const result = await yf.search(symbol, {
      newsCount: limit,
      quotesCount: 0,
    });

    const news = result.news ?? [];
    return news.slice(0, limit).map((item) => ({
      headline: item.title,
      url: item.link,
      source: item.publisher,
      publishedAt: item.providerPublishTime,
      ...(item.relatedTickers !== undefined ? { relatedSymbols: item.relatedTickers } : {}),
    }));
  }
}
