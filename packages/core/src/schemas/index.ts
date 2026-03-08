import { z } from "zod";

export const transactionTypeSchema = z.enum(["buy", "sell", "dividend"]);

export const addTransactionSchema = z.object({
  holdingId: z.number().int().positive(),
  type: transactionTypeSchema,
  date: z.string().date(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  fees: z.number().min(0).default(0),
  currency: z.string().length(3).default("USD"),
  notes: z.string().max(500).optional(),
});

export const addHoldingSchema = z.object({
  symbol: z.string().min(1).max(20).toUpperCase(),
  name: z.string().min(1).max(200),
  quantity: z.number().min(0),
  avgCostBasis: z.number().min(0),
  currency: z.string().length(3).default("USD"),
  exchange: z.string().max(20).default(""),
});

export const updateHoldingSchema = z.object({
  id: z.number().int().positive(),
  symbol: z.string().min(1).max(20).toUpperCase().optional(),
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().min(0).optional(),
  avgCostBasis: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  exchange: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  // Upper bounds prevent oversized inputs from reaching argon2 hashing.
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(1000),
});

export const symbolSchema = z.string().min(1).max(20).toUpperCase();

export const timeframeSchema = z.enum(["1h", "1d", "1w", "1m", "3m", "1y", "all"]);

export type AddTransactionInput = z.infer<typeof addTransactionSchema>;
export type AddHoldingInput = z.infer<typeof addHoldingSchema>;
export type UpdateHoldingInput = z.infer<typeof updateHoldingSchema>;
export type Timeframe = z.infer<typeof timeframeSchema>;
