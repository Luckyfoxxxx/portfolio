import type { Db } from "@portfolio/db";

export interface Context {
  db: Db;
  userId: string | null;
  isAdmin: boolean;
}

export interface AuthedContext extends Context {
  userId: string;
}
