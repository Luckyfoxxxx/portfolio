import { TRPCError, initTRPC } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  // Strip stack traces from responses outside development to prevent
  // internal implementation details leaking to the client.
  errorFormatter({ shape }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        stack: process.env.NODE_ENV === "development" ? shape.data.stack : undefined,
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
