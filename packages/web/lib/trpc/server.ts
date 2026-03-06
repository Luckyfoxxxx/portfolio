import { initTRPC, TRPCError } from "@trpc/server";
import { getSession } from "../auth/session.js";
import { db } from "../db/index.js";

export async function createContext() {
  const session = await getSession();
  return {
    db,
    userId: session?.user.id ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
