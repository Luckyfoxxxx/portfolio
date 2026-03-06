import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AlphaVantageAdapter } from "../alpha-vantage/adapter.js";

const server = setupServer();

beforeEach(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  server.close();
});

const mockGlobalQuote = {
  "Global Quote": {
    "01. symbol": "AAPL",
    "02. open": "148.75",
    "03. high": "151.00",
    "04. low": "148.50",
    "05. price": "150.25",
    "06. volume": "82345678",
    "07. latest trading day": "2024-01-01",
    "08. previous close": "147.75",
    "09. change": "2.50",
    "10. change percent": "1.6919%",
  },
};

const mockTimeSeries = {
  "Meta Data": {
    "1. Information": "Daily Adjusted",
    "2. Symbol": "AAPL",
    "3. Last Refreshed": "2024-01-05",
    "4. Output Size": "Full size",
    "5. Time Zone": "US/Eastern",
  },
  "Time Series (Daily)": {
    "2024-01-05": {
      "1. open": "185.00",
      "2. high": "187.00",
      "3. low": "184.50",
      "4. close": "186.00",
      "5. adjusted close": "186.00",
      "6. volume": "50000000",
      "7. dividend amount": "0.0000",
      "8. split coefficient": "1.0",
    },
    "2024-01-04": {
      "1. open": "182.00",
      "2. high": "185.50",
      "3. low": "181.00",
      "4. close": "185.00",
      "5. adjusted close": "185.00",
      "6. volume": "45000000",
      "7. dividend amount": "0.0000",
      "8. split coefficient": "1.0",
    },
  },
};

describe("AlphaVantageAdapter", () => {
  it("parses global quote correctly", async () => {
    server.use(
      http.get("https://www.alphavantage.co/query", () =>
        HttpResponse.json(mockGlobalQuote)
      )
    );

    const adapter = new AlphaVantageAdapter("test-key");
    const quote = await adapter.getQuote("AAPL");

    expect(quote.symbol).toBe("AAPL");
    expect(quote.price).toBe(150.25);
    expect(quote.change).toBe(2.5);
    expect(quote.changePercent).toBeCloseTo(1.6919);
    expect(quote.open).toBe(148.75);
    expect(quote.high).toBe(151.0);
    expect(quote.low).toBe(148.5);
    expect(quote.volume).toBe(82345678);
    expect(quote.source).toBe("alpha-vantage");
    expect(quote.currency).toBe("USD");
  });

  it("throws on API error", async () => {
    server.use(
      http.get("https://www.alphavantage.co/query", () =>
        HttpResponse.json({ Note: "API limit" }, { status: 200 })
      )
    );

    const adapter = new AlphaVantageAdapter("test-key");
    await expect(adapter.getQuote("AAPL")).rejects.toThrow("No price data");
  });

  it("throws on HTTP error", async () => {
    server.use(
      http.get("https://www.alphavantage.co/query", () =>
        HttpResponse.json({}, { status: 500 })
      )
    );

    const adapter = new AlphaVantageAdapter("test-key");
    await expect(adapter.getQuote("AAPL")).rejects.toThrow("Alpha Vantage API error");
  });

  it("parses historical data and filters by date range", async () => {
    server.use(
      http.get("https://www.alphavantage.co/query", () =>
        HttpResponse.json(mockTimeSeries)
      )
    );

    const adapter = new AlphaVantageAdapter("test-key");
    const from = new Date("2024-01-04");
    const to = new Date("2024-01-06");
    const bars = await adapter.getHistory("AAPL", from, to);

    expect(bars).toHaveLength(2);
    expect(bars[0]?.close).toBe(185.0);
    expect(bars[1]?.close).toBe(186.0);
    // Should be sorted ascending
    expect(bars[0]?.date.getTime()).toBeLessThan(bars[1]?.date.getTime() ?? 0);
  });

  it("throws when no time series in response", async () => {
    server.use(
      http.get("https://www.alphavantage.co/query", () =>
        HttpResponse.json({ "Meta Data": {} })
      )
    );

    const adapter = new AlphaVantageAdapter("test-key");
    await expect(
      adapter.getHistory("AAPL", new Date("2024-01-01"), new Date())
    ).rejects.toThrow("No historical data");
  });
});
