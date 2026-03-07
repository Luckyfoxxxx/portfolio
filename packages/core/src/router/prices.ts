import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { priceSnapshots } from "@portfolio/db";
import { symbolSchema } from "../schemas/index";
import { protectedProcedure, router } from "./trpc";

export const pricesRouter = router({
  latest: protectedProcedure
    .input(z.object({ symbol: symbolSchema }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db
        .select()
        .from(priceSnapshots)
        .where(eq(priceSnapshots.symbol, input.symbol))
        .orderBy(desc(priceSnapshots.timestamp))
        .limit(1);
      return results[0] ?? null;
    }),

  history: protectedProcedure
    .input(
      z.object({
        symbol: symbolSchema,
        limit: z.number().int().min(1).max(500).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(priceSnapshots)
        .where(eq(priceSnapshots.symbol, input.symbol))
        .orderBy(desc(priceSnapshots.timestamp))
        .limit(input.limit);
    }),
});
