import { hash } from "@node-rs/argon2";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as schema from "../src/schema/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env["DATABASE_URL"] ?? path.join(__dirname, "../../../data/test.db");
const MIGRATIONS_FOLDER = path.join(__dirname, "../src/migrations");

mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Today = 2026-03-07
const TODAY = new Date("2026-03-07T16:00:00Z");

function daysAgo(days: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  return d;
}

const HOLDINGS_DEF = [
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", exchange: "NYSEARCA" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", exchange: "NYSEARCA" },
  { symbol: "VXUS", name: "Vanguard Total Intl Stock ETF", exchange: "NYSEARCA" },
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corp.", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ" },
] as const;

// [daysAgo, type, quantity, price, fees, notes?]
type TxDef = [number, "buy" | "sell" | "dividend", number, number, number, string?];

// Dividends use quantity=shares_held, price=per_share_amount
const TRANSACTIONS_DEF: Record<string, TxDef[]> = {
  VTI: [
    [730, "buy",      20,  200.50,  0],
    [600, "buy",      10,  208.30,  0],
    [500, "dividend", 30,    0.85,  0, "Q1 2024"],
    [450, "buy",       5,  215.70,  0],
    [360, "dividend", 35,    0.92,  0, "Q2 2024"],
    [270, "buy",       8,  235.40,  0],
    [180, "dividend", 43,    0.88,  0, "Q3 2024"],
    [ 90, "dividend", 43,    0.95,  0, "Q4 2024"],
    [ 60, "buy",       5,  255.10,  0],
    [ 15, "sell",      3,  258.80,  0],
  ],
  VOO: [
    [720, "buy",      10,  442.00,  0],
    [580, "buy",       5,  455.20,  0],
    [490, "dividend", 15,    1.65,  0, "Q1 2024"],
    [400, "buy",       3,  470.80,  0],
    [350, "dividend", 18,    1.78,  0, "Q2 2024"],
    [260, "buy",       4,  495.30,  0],
    [170, "dividend", 22,    1.72,  0, "Q3 2024"],
    [ 85, "dividend", 22,    1.85,  0, "Q4 2024"],
    [ 45, "buy",       2,  515.60,  0],
  ],
  VXUS: [
    [710, "buy",      50,   55.20,  0],
    [590, "buy",      30,   56.80,  0],
    [480, "dividend", 80,    0.52,  0, "Q1 2024"],
    [380, "buy",      20,   58.90,  0],
    [340, "dividend",100,    0.48,  0, "Q2 2024"],
    [250, "sell",     10,   60.40,  0],
    [160, "buy",      25,   61.20,  0],
    [ 80, "dividend",115,    0.55,  0, "Q3 2024"],
    [ 30, "buy",      15,   63.50,  0],
  ],
  AAPL: [
    [725, "buy",      15,  175.50,  1.50],
    [610, "buy",      10,  182.30,  1.50],
    [520, "sell",      5,  189.40,  1.50],
    [430, "buy",       8,  178.60,  1.50],
    [350, "buy",      12,  192.80,  1.50],
    [280, "dividend", 40,    0.25,  0,    "Q3 2024"],
    [210, "buy",       5,  205.70,  1.50],
    [140, "sell",      8,  215.30,  1.50],
    [ 70, "buy",      10,  210.80,  1.50],
    [ 20, "buy",       5,  218.40,  1.50],
  ],
  MSFT: [
    [715, "buy",       8,  372.50,  1.50],
    [600, "buy",       5,  385.20,  1.50],
    [510, "buy",       3,  392.80,  1.50],
    [420, "dividend", 16,    0.75,  0,    "Q2 2024"],
    [360, "buy",       4,  405.60,  1.50],
    [290, "sell",      5,  425.40,  1.50],
    [220, "buy",       6,  418.90,  1.50],
    [150, "dividend", 21,    0.83,  0,    "Q3 2024"],
    [ 80, "buy",       3,  430.20,  1.50],
    [ 25, "buy",       2,  415.80,  1.50],
  ],
  NVDA: [
    [700, "buy",      30,   62.50,  1.50],
    [600, "buy",      20,   72.80,  1.50],
    [520, "buy",      15,   85.30,  1.50],
    [440, "sell",     10,   95.60,  1.50],
    [370, "buy",      25,  108.40,  1.50],
    [300, "buy",      20,  118.90,  1.50],
    [230, "sell",     15,  125.70,  1.50],
    [160, "buy",      30,  115.30,  1.50],
    [ 90, "buy",      25,  132.60,  1.50],
    [ 30, "sell",     20,  128.40,  1.50],
  ],
  GOOGL: [
    [718, "buy",      15,  141.50,  1.50],
    [608, "buy",      10,  148.20,  1.50],
    [510, "sell",      5,  155.80,  1.50],
    [430, "buy",      12,  162.40,  1.50],
    [360, "buy",       8,  170.90,  1.50],
    [285, "sell",      6,  175.30,  1.50],
    [210, "buy",      10,  168.60,  1.50],
    [145, "buy",       8,  178.20,  1.50],
    [ 75, "buy",       5,  182.80,  1.50],
    [ 15, "sell",      3,  185.60,  1.50],
  ],
};

// Current prices used as endpoint for 30-day price history
const CURRENT_PRICES: Record<string, number> = {
  VTI: 258.80,
  VOO: 516.40,
  VXUS:  63.50,
  AAPL: 218.40,
  MSFT: 415.80,
  NVDA: 128.40,
  GOOGL: 185.60,
};

function generatePriceHistory(
  symbol: string,
  currentPrice: number,
): Array<{ price: number; date: Date }> {
  const startPrice = currentPrice * 0.88;
  const symbolHash = symbol
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);

  return Array.from({ length: 30 }, (_, i) => {
    const dayOffset = 29 - i; // 29 days ago → today
    const progress = i / 29;
    const noise = (((symbolHash * (dayOffset + 1) * 7919) % 1000) / 1000 - 0.5) * 0.02;
    const price =
      Math.round((startPrice + (currentPrice - startPrice) * progress) * (1 + noise) * 100) / 100;
    return { price, date: daysAgo(dayOffset) };
  });
}

function calcHoldingStats(txDefs: TxDef[]): { quantity: number; avgCostBasis: number } {
  let quantity = 0;
  let totalCost = 0;

  for (const [, type, qty, price, fees] of txDefs) {
    if (type === "buy") {
      totalCost += qty * price + fees;
      quantity += qty;
    } else if (type === "sell") {
      const avgCost = quantity > 0 ? totalCost / quantity : 0;
      totalCost -= qty * avgCost;
      quantity -= qty;
    }
    // dividends don't affect cost basis
  }

  return {
    quantity: Math.round(quantity * 10000) / 10000,
    avgCostBasis: quantity > 0 ? Math.round((totalCost / quantity) * 100) / 100 : 0,
  };
}

const NEWS_ITEMS = [
  {
    symbol: "AAPL",
    headline: "Apple reports record quarterly revenue driven by iPhone 17 sales",
    url: "https://example.com/news/aapl-q1-2026",
    source: "Reuters",
    days: 5,
  },
  {
    symbol: "NVDA",
    headline: "NVIDIA announces next-generation Blackwell Ultra GPU architecture",
    url: "https://example.com/news/nvda-blackwell-ultra",
    source: "Bloomberg",
    days: 8,
  },
  {
    symbol: "MSFT",
    headline: "Microsoft Azure AI services revenue surpasses $20B annual run rate",
    url: "https://example.com/news/msft-azure-ai",
    source: "WSJ",
    days: 12,
  },
  {
    symbol: "GOOGL",
    headline: "Alphabet introduces Gemini 3 with breakthrough reasoning capabilities",
    url: "https://example.com/news/googl-gemini-3",
    source: "TechCrunch",
    days: 15,
  },
  {
    symbol: "VTI",
    headline: "Vanguard Total Market ETF sees record inflows amid market optimism",
    url: "https://example.com/news/vti-inflows",
    source: "Financial Times",
    days: 3,
  },
  {
    symbol: "NVDA",
    headline: "NVDA pulls back amid profit-taking after 40% Q1 rally",
    url: "https://example.com/news/nvda-pullback",
    source: "MarketWatch",
    days: 2,
  },
  {
    symbol: "AAPL",
    headline: "Apple Vision Pro 2 launch drives spatial computing ecosystem growth",
    url: "https://example.com/news/aapl-vision-pro-2",
    source: "9to5Mac",
    days: 20,
  },
];

async function main() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = OFF");
  const db = drizzle(sqlite, { schema });

  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("Migrations applied.");

  // Wipe all data
  for (const table of ["sessions", "transactions", "holdings", "price_snapshots", "news_items", "users"]) {
    sqlite.exec(`DELETE FROM ${table}`);
  }
  console.log("Tables wiped.");

  sqlite.pragma("foreign_keys = ON");

  // User
  const passwordHash = await hash("password123456");
  await db.insert(schema.users).values({
    id: "dev-user-001",
    username: "admin",
    passwordHash,
  });
  console.log("User created: admin / password123456");

  // Holdings + transactions
  for (const def of HOLDINGS_DEF) {
    const txDefs = TRANSACTIONS_DEF[def.symbol]!;
    const { quantity, avgCostBasis } = calcHoldingStats(txDefs);

    const [holding] = await db
      .insert(schema.holdings)
      .values({
        symbol: def.symbol,
        name: def.name,
        quantity,
        avgCostBasis,
        currency: "USD",
        exchange: def.exchange,
      })
      .returning();

    for (const [ago, type, qty, price, fees, notes] of txDefs) {
      await db.insert(schema.transactions).values({
        holdingId: holding!.id,
        symbol: def.symbol,
        type,
        date: daysAgo(ago),
        quantity: qty,
        price,
        fees,
        currency: "USD",
        notes: notes ?? null,
      });
    }

    console.log(`  ${def.symbol}: ${quantity} shares, ${txDefs.length} transactions`);
  }

  // Price snapshots (30 days per holding)
  for (const def of HOLDINGS_DEF) {
    const history = generatePriceHistory(def.symbol, CURRENT_PRICES[def.symbol]!);
    for (const { price, date } of history) {
      await db.insert(schema.priceSnapshots).values({
        symbol: def.symbol,
        price,
        currency: "USD",
        source: "seed",
        timestamp: date,
      });
    }
  }
  console.log(`Price snapshots: 30 days x ${HOLDINGS_DEF.length} symbols`);

  // News
  for (const item of NEWS_ITEMS) {
    await db.insert(schema.newsItems).values({
      symbol: item.symbol,
      headline: item.headline,
      url: item.url,
      source: item.source,
      publishedAt: daysAgo(item.days),
    });
  }
  console.log(`News items: ${NEWS_ITEMS.length}`);

  sqlite.close();
  console.log(`\nDev seed complete. DB: ${DB_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
