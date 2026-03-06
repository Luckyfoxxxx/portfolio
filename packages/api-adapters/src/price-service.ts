import type { PriceQuote, PriceService } from "./types.js";

/**
 * PriceServiceWithFallback tries the primary adapter first,
 * then falls back to secondary adapters in order.
 */
export class PriceServiceWithFallback implements PriceService {
  constructor(
    private readonly primary: PriceService,
    private readonly fallbacks: PriceService[] = []
  ) {}

  async getQuote(symbol: string): Promise<PriceQuote> {
    const adapters = [this.primary, ...this.fallbacks];
    const errors: Error[] = [];

    for (const adapter of adapters) {
      try {
        return await adapter.getQuote(symbol);
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
      }
    }

    throw new AggregateError(
      errors,
      `All adapters failed for symbol: ${symbol}`
    );
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
    interval?: "1d" | "1wk" | "1mo"
  ) {
    const adapters = [this.primary, ...this.fallbacks];
    const errors: Error[] = [];

    for (const adapter of adapters) {
      try {
        return await adapter.getHistory(symbol, from, to, interval);
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
      }
    }

    throw new AggregateError(
      errors,
      `All adapters failed for history: ${symbol}`
    );
  }
}
