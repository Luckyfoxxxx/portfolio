import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { holdings, transactions } from "@portfolio/db";
import {
  calculateCostBasisFIFO,
  calculatePnL,
} from "../calculations/index";
import { addHoldingSchema, addTransactionSchema, updateHoldingSchema } from "../schemas/index";
import type { TransactionRecord } from "../types/index";
import { protectedProcedure, router } from "./trpc";

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

  update: protectedProcedure
    .input(updateHoldingSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      await ctx.db.update(holdings).set({ ...fields, updatedAt: new Date() }).where(eq(holdings.id, id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: holdings.id })
        .from(holdings)
        .where(eq(holdings.id, input.id));
      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Holding not found" });
      }
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

  deleteTransaction: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the transaction first so we know which holding to recalculate.
      const txRows = await ctx.db
        .select()
        .from(transactions)
        .where(eq(transactions.id, input.id));
      if (!txRows[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
      }
      const { holdingId } = txRows[0];


      await ctx.db.delete(transactions).where(eq(transactions.id, input.id));

      // Recalculate the holding's quantity and avg cost basis from remaining txs.
      const remaining = await ctx.db
        .select()
        .from(transactions)
        .where(eq(transactions.holdingId, holdingId));

      const txRecords: TransactionRecord[] = remaining.map((tx) => ({
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
        .where(eq(holdings.id, holdingId));

      return { success: true };
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

      const holding = holdingResults[0];

      const result = await ctx.db
        .insert(transactions)
        .values({
          ...input,
          // Derive symbol and currency from the holding — do not trust client values.
          symbol: holding.symbol,
          currency: holding.currency,
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
