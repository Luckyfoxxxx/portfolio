import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { holdings, transactions } from "@portfolio/db";
import {
  calculateCostBasisFIFO,
  calculatePnL,
  calculateRealizedPnL,
} from "../calculations/index.js";
import { addHoldingSchema, addTransactionSchema, symbolSchema } from "../schemas/index.js";
import type { TransactionRecord } from "../types/index.js";
import { protectedProcedure, router } from "./trpc.js";

export const holdingsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(holdings);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db
        .select()
        .from(holdings)
        .where(eq(holdings.id, input.id));
      const holding = results[0];
      if (!holding) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return holding;
    }),

  add: protectedProcedure
    .input(addHoldingSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.insert(holdings).values(input).returning();
      return result[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(holdings).where(eq(holdings.id, input.id));
      return { success: true };
    }),

  getWithPnL: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), currentPrice: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const holdingResults = await ctx.db
        .select()
        .from(holdings)
        .where(eq(holdings.id, input.id));
      const holding = holdingResults[0];
      if (!holding) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const txResults = await ctx.db
        .select()
        .from(transactions)
        .where(eq(transactions.holdingId, input.id));

      const txRecords: TransactionRecord[] = txResults.map((tx) => ({
        date: tx.date,
        type: tx.type,
        quantity: tx.quantity,
        price: tx.price,
        fees: tx.fees,
        currency: tx.currency,
      }));

      const costBasis = calculateCostBasisFIFO(txRecords);

      const pnl = calculatePnL(
        {
          symbol: holding.symbol,
          quantity: holding.quantity,
          avgCostBasis: holding.avgCostBasis,
          currency: holding.currency,
          currentPrice: input.currentPrice,
        },
        txRecords
      );

      return { holding, costBasis, pnl };
    }),

  transactions: protectedProcedure
    .input(z.object({ holdingId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(transactions)
        .where(eq(transactions.holdingId, input.holdingId));
    }),

  addTransaction: protectedProcedure
    .input(addTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify holding exists
      const holdingResults = await ctx.db
        .select()
        .from(holdings)
        .where(eq(holdings.id, input.holdingId));
      if (!holdingResults[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Holding not found" });
      }

      const result = await ctx.db
        .insert(transactions)
        .values({
          ...input,
          date: new Date(input.date),
        })
        .returning();

      // Recalculate avg cost basis
      const allTxs = await ctx.db
        .select()
        .from(transactions)
        .where(eq(transactions.holdingId, input.holdingId));

      const txRecords: TransactionRecord[] = allTxs.map((tx) => ({
        date: tx.date,
        type: tx.type,
        quantity: tx.quantity,
        price: tx.price,
        fees: tx.fees,
        currency: tx.currency,
      }));

      const costBasis = calculateCostBasisFIFO(txRecords);
      await ctx.db
        .update(holdings)
        .set({
          quantity: costBasis.totalQuantity,
          avgCostBasis: costBasis.averageCostPerShare,
          updatedAt: new Date(),
        })
        .where(eq(holdings.id, input.holdingId));

      return result[0];
    }),
});
