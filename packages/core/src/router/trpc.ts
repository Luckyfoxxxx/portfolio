import { TRPCError, initTRPC } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  // Strip stack traces from responses outside development to prevent
  // internal implementation details leaking to the client.
  // Also replace INTERNAL_SERVER_ERROR messages in production — raw DB/runtime
  // error messages can expose table names, column names, and file paths.
  errorFormatter({ shape }) {
    const isProd = process.env.NODE_ENV !== "development";
    return {
      ...shape,
      message:
        isProd && shape.data.code === "INTERNAL_SERVER_ERROR"
          ? "An internal error occurred"
          : shape.message,
      data: {
        ...shape.data,
        stack: isProd ? undefined : shape.data.stack,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});
