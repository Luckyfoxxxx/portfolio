export interface PriceQuote {
  symbol: string;
  price: number;
  currency: string;
  timestamp: Date;
  source: string;
  change?: number;
  changePercent?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  marketCap?: number;
}

export interface HistoricalBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

export interface NewsArticle {
  headline: string;
  url: string;
  source?: string;
  publishedAt: Date;
  summary?: string;
  relatedSymbols?: string[];
}

export interface PriceService {
  getQuote(symbol: string): Promise<PriceQuote>;
  getQuotes(symbols: string[]): Promise<PriceQuote[]>;
  getHistory(
    symbol: string,
    from: Date,
    to: Date,
    interval?: "1d" | "1wk" | "1mo"
  ): Promise<HistoricalBar[]>;
  getNews?(symbol: string, limit?: number): Promise<NewsArticle[]>;
}
