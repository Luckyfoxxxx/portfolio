import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { FinnhubAdapter } from "../finnhub/adapter";

const server = setupServer();

beforeEach(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  server.close();
});

const mockQuoteResponse = {
  c: 150.25,
  d: 2.5,
  dp: 1.69,
  h: 151.0,
  l: 148.5,
  o: 148.75,
  pc: 147.75,
  t: 1704067200, // 2024-01-01
};

describe("FinnhubAdapter", () => {
  it("parses quote response correctly", async () => {
    server.use(
      http.get("https://finnhub.io/api/v1/quote", () =>
        HttpResponse.json(mockQuoteResponse)
      )
    );

    const adapter = new FinnhubAdapter("test-key");
    const quote = await adapter.getQuote("AAPL");

    expect(quote.symbol).toBe("AAPL");
    expect(quote.price).toBe(150.25);
    expect(quote.change).toBe(2.5);
    expect(quote.changePercent).toBeCloseTo(1.69);
    expect(quote.open).toBe(148.75);
    expect(quote.high).toBe(151.0);
    expect(quote.low).toBe(148.5);
    expect(quote.source).toBe("finnhub");
  });

  it("throws on API error", async () => {
    server.use(
      http.get("https://finnhub.io/api/v1/quote", () =>
        HttpResponse.json({ error: "Invalid API key" }, { status: 401 })
      )
    );

    const adapter = new FinnhubAdapter("bad-key");
    await expect(adapter.getQuote("AAPL")).rejects.toThrow("Finnhub API error");
  });

  it("throws when price is 0 (unknown symbol)", async () => {
    server.use(
      http.get("https://finnhub.io/api/v1/quote", () =>
        HttpResponse.json({ c: 0, d: 0, dp: 0, h: 0, l: 0, o: 0, pc: 0, t: 0 })
      )
    );

    const adapter = new FinnhubAdapter("test-key");
    await expect(adapter.getQuote("INVALID")).rejects.toThrow("No price data");
  });

  it("getQuotes returns partial results on mixed success/fail", async () => {
    let callCount = 0;
    server.use(
      http.get("https://finnhub.io/api/v1/quote", () => {
        callCount++;
        if (callCount === 1) return HttpResponse.json(mockQuoteResponse);
        return HttpResponse.json({ error: "fail" }, { status: 500 });
      })
    );

    const adapter = new FinnhubAdapter("test-key");
    const results = await adapter.getQuotes(["AAPL", "FAIL"]);
    expect(results).toHaveLength(1);
    expect(results[0]?.symbol).toBe("AAPL");
  });

  it("getHistory throws (not supported)", async () => {
    const adapter = new FinnhubAdapter("test-key");
    await expect(
      adapter.getHistory("AAPL", new Date(), new Date())
    ).rejects.toThrow("historical data");
  });
});
