import { holdingsRouter } from "./holdings.js";
import { newsRouter } from "./news.js";
import { pricesRouter } from "./prices.js";
import { router } from "./trpc.js";

export { router } from "./trpc.js";
export type { Context } from "./context.js";

export const appRouter = router({
  holdings: holdingsRouter,
  prices: pricesRouter,
  news: newsRouter,
});

export type AppRouter = typeof appRouter;
