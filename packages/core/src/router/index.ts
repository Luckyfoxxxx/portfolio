import { holdingsRouter } from "./holdings";
import { newsRouter } from "./news";
import { pricesRouter } from "./prices";
import { router } from "./trpc";

export { router } from "./trpc";
export type { Context } from "./context";

export const appRouter = router({
  holdings: holdingsRouter,
  prices: pricesRouter,
  news: newsRouter,
});

export type AppRouter = typeof appRouter;
