import { getSession } from "../auth/session";
import { db } from "../db/index";

export async function createContext() {
  const session = await getSession();
  return {
    db,
    userId: session?.user.id ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
