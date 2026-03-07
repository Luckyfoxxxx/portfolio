import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { newsItems } from "@portfolio/db";
import { symbolSchema } from "../schemas/index";
import { protectedProcedure, router } from "./trpc";

export const newsRouter = router({
  bySymbol: protectedProcedure
    .input(
      z.object({
        symbol: symbolSchema,
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(newsItems)
        .where(eq(newsItems.symbol, input.symbol))
        .orderBy(desc(newsItems.publishedAt))
        .limit(input.limit);
    }),
});
